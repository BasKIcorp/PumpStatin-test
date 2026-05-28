from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps_profile import get_profile_bundle, resolve_plugins

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
    return result


@router.post("/generate-pdf")
def generate_pdf(
    body: GeneratePdfBody,
    bundle: Annotated[dict, Depends(get_profile_bundle)],
):
    _, _, pdf, branding, profile_id = resolve_plugins(bundle)
    selection = _selection_cache.get(body.selection_id)
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
