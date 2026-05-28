from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Select, select

from app.api.deps import get_current_user, require_user
from app.api.deps_profile import get_profile_bundle, resolve_plugins
from app.db.models import SelectionHistoryModel, SelectionProjectModel
from app.db.session import SessionLocal
from app.pdf.reportlab_build import build_project_pdf

router = APIRouter()

_selection_cache: dict[str, dict[str, Any]] = {}


class MatchPumpsBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_line: str = Field(validation_alias="productLine")
    flow_id: str = Field(validation_alias="flowId")
    parameters: dict[str, Any] = Field(default_factory=dict)


class BuildStationBody(MatchPumpsBody):
    selected_pump_id: str = Field(validation_alias="selectedPumpId")


class GeneratePdfBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    selection_id: str = Field(validation_alias="selectionId")
    doc_type: str = Field(default="selection", validation_alias="docType")


class SelectionProjectBody(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class AttachSelectionsBody(BaseModel):
    selection_ids: list[str] = Field(validation_alias="selectionIds", min_length=1)


class ProjectGeneratePdfBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    doc_type: str = Field(default="tkp", validation_alias="docType")
    selection_ids: list[str] | None = Field(default=None, validation_alias="selectionIds")


class SelectionHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    selection_id: str
    profile_id: str
    product_line: str
    flow_id: str
    selected_pump_id: str
    summary: str
    project_id: int | None
    created_at: datetime
    station_payload: dict[str, Any] = Field(validation_alias="station_payload")


class SelectionProjectItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    selections_count: int


async def _fetch_selection_for_user(
    selection_id: str,
    username: str,
) -> SelectionHistoryModel | None:
    async with SessionLocal() as session:
        stmt: Select[tuple[SelectionHistoryModel]] = select(SelectionHistoryModel).where(
            SelectionHistoryModel.selection_id == selection_id,
            SelectionHistoryModel.owner_username == username,
        )
        row = (await session.execute(stmt)).scalar_one_or_none()
        return row


async def _persist_selection(
    owner_username: str | None,
    profile_id: str,
    body: BuildStationBody,
    result: dict[str, Any],
) -> None:
    if not owner_username:
        return
    async with SessionLocal() as session:
        record = SelectionHistoryModel(
            selection_id=result["selectionId"],
            owner_username=owner_username,
            profile_id=profile_id,
            product_line=body.product_line,
            flow_id=body.flow_id,
            selected_pump_id=body.selected_pump_id,
            summary=result.get("summary", ""),
            parameters=body.parameters,
            station_payload=result,
        )
        await session.merge(record)
        await session.commit()


@router.post("/match-pumps")
async def match_pumps(
    body: MatchPumpsBody,
    bundle: Annotated[dict, Depends(get_profile_bundle)],
):
    algo, db, _, _, _ = resolve_plugins(bundle)
    pumps = await algo.match_pumps(
        body.product_line, body.flow_id, body.parameters, db
    )
    return {"pumps": pumps}


@router.post("/build-station")
async def build_station(
    body: BuildStationBody,
    bundle: Annotated[dict, Depends(get_profile_bundle)],
    current_user: Annotated[dict | None, Depends(get_current_user)],
):
    algo, db, _, _, profile_id = resolve_plugins(bundle)
    result = await algo.build_station(
        body.product_line,
        body.flow_id,
        body.parameters,
        body.selected_pump_id,
        db,
    )
    sid = result["selectionId"]
    _selection_cache[sid] = {**result, "_profileId": profile_id}
    await _persist_selection(current_user["username"] if current_user else None, profile_id, body, result)
    return result


@router.post("/generate-pdf")
async def generate_pdf(
    body: GeneratePdfBody,
    bundle: Annotated[dict, Depends(get_profile_bundle)],
    current_user: Annotated[dict | None, Depends(get_current_user)],
):
    _, _, pdf, branding, profile_id = resolve_plugins(bundle)
    selection = _selection_cache.get(body.selection_id)
    if not selection and current_user:
        db_record = await _fetch_selection_for_user(body.selection_id, current_user["username"])
        if db_record:
            selection = {
                **db_record.station_payload,
                "_profileId": db_record.profile_id,
            }
    if not selection:
        raise HTTPException(404, "Selection not found")
    if selection.get("_profileId") != profile_id:
        raise HTTPException(403, "PDF недоступен для этого профиля")
    content = pdf.render(selection, branding, body.doc_type)
    filename_suffix = (
        "tkp"
        if body.doc_type == "tkp"
        else "techsheet"
        if body.doc_type == "techsheet"
        else "selection"
    )
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{profile_id}-{filename_suffix}.pdf"'
        },
    )


@router.get("/history")
async def get_history(
    current_user: Annotated[dict, Depends(require_user)],
):
    async with SessionLocal() as session:
        stmt = (
            select(SelectionHistoryModel)
            .where(SelectionHistoryModel.owner_username == current_user["username"])
            .order_by(SelectionHistoryModel.created_at.desc())
            .limit(200)
        )
        rows = (await session.execute(stmt)).scalars().all()
    return {"items": [SelectionHistoryItem.model_validate(row).model_dump(by_alias=True) for row in rows]}


@router.get("/projects")
async def get_projects(
    current_user: Annotated[dict, Depends(require_user)],
):
    async with SessionLocal() as session:
        stmt = (
            select(SelectionProjectModel)
            .where(SelectionProjectModel.owner_username == current_user["username"])
            .order_by(SelectionProjectModel.created_at.desc())
        )
        projects = (await session.execute(stmt)).scalars().all()
        payload: list[SelectionProjectItem] = []
        for project in projects:
            count_stmt = select(SelectionHistoryModel).where(
                SelectionHistoryModel.owner_username == current_user["username"],
                SelectionHistoryModel.project_id == project.id,
            )
            selections_count = len((await session.execute(count_stmt)).scalars().all())
            payload.append(
                SelectionProjectItem(
                    id=project.id,
                    name=project.name,
                    created_at=project.created_at,
                    selections_count=selections_count,
                )
            )
    return {"items": [item.model_dump() for item in payload]}


@router.post("/projects")
async def create_project(
    body: SelectionProjectBody,
    current_user: Annotated[dict, Depends(require_user)],
):
    async with SessionLocal() as session:
        project = SelectionProjectModel(
            owner_username=current_user["username"],
            name=body.name.strip(),
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)
    return {"id": project.id, "name": project.name}


@router.post("/projects/{project_id}/selections")
async def attach_selections_to_project(
    project_id: int,
    body: AttachSelectionsBody,
    current_user: Annotated[dict, Depends(require_user)],
):
    async with SessionLocal() as session:
        project = (
            await session.execute(
                select(SelectionProjectModel).where(
                    SelectionProjectModel.id == project_id,
                    SelectionProjectModel.owner_username == current_user["username"],
                )
            )
        ).scalar_one_or_none()
        if not project:
            raise HTTPException(404, "Project not found")
        stmt = select(SelectionHistoryModel).where(
            SelectionHistoryModel.owner_username == current_user["username"],
            SelectionHistoryModel.selection_id.in_(body.selection_ids),
        )
        rows = (await session.execute(stmt)).scalars().all()
        if not rows:
            raise HTTPException(404, "No selections found")
        for row in rows:
            row.project_id = project_id
        await session.commit()
    return {"attached": len(rows)}


@router.get("/projects/{project_id}/selections")
async def get_project_selections(
    project_id: int,
    current_user: Annotated[dict, Depends(require_user)],
):
    async with SessionLocal() as session:
        project = (
            await session.execute(
                select(SelectionProjectModel).where(
                    SelectionProjectModel.id == project_id,
                    SelectionProjectModel.owner_username == current_user["username"],
                )
            )
        ).scalar_one_or_none()
        if not project:
            raise HTTPException(404, "Project not found")
        stmt = (
            select(SelectionHistoryModel)
            .where(
                SelectionHistoryModel.owner_username == current_user["username"],
                SelectionHistoryModel.project_id == project_id,
            )
            .order_by(SelectionHistoryModel.created_at.desc())
        )
        rows = (await session.execute(stmt)).scalars().all()
    return {"items": [SelectionHistoryItem.model_validate(row).model_dump(by_alias=True) for row in rows]}


@router.post("/projects/{project_id}/generate-pdf")
async def generate_project_pdf(
    project_id: int,
    body: ProjectGeneratePdfBody,
    bundle: Annotated[dict, Depends(get_profile_bundle)],
    current_user: Annotated[dict, Depends(require_user)],
):
    _, _, pdf, branding, profile_id = resolve_plugins(bundle)
    doc_type = body.doc_type if body.doc_type in ("tkp", "techsheet") else "tkp"
    async with SessionLocal() as session:
        project = (
            await session.execute(
                select(SelectionProjectModel).where(
                    SelectionProjectModel.id == project_id,
                    SelectionProjectModel.owner_username == current_user["username"],
                )
            )
        ).scalar_one_or_none()
        if not project:
            raise HTTPException(404, "Project not found")
        stmt = (
            select(SelectionHistoryModel)
            .where(
                SelectionHistoryModel.owner_username == current_user["username"],
                SelectionHistoryModel.project_id == project_id,
                SelectionHistoryModel.profile_id == profile_id,
            )
            .order_by(SelectionHistoryModel.created_at.asc())
        )
        rows = (await session.execute(stmt)).scalars().all()
    if body.selection_ids:
        allowed = set(body.selection_ids)
        rows = [row for row in rows if row.selection_id in allowed]
    if not rows:
        raise HTTPException(404, "No selections in project")
    selections = [row.station_payload for row in rows if isinstance(row.station_payload, dict)]
    if not selections:
        raise HTTPException(404, "No selections in project")
    content = build_project_pdf(selections, branding, pdf.template_id, doc_type, project.name)
    filename_suffix = "tkp" if doc_type == "tkp" else "techsheets"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{profile_id}-project-{project_id}-{filename_suffix}.pdf"'
        },
    )
