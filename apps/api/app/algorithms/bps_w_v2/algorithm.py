from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

from app.algorithms.bps_w_v2.models import SelectionInputV2
from app.algorithms.bps_w_v2.parameter_mapper import map_parameters
from app.algorithms.bps_w_v2.rules_loader import load_algorithm_rules
from app.algorithms.bps_w_v2.steps.bom_generator import generate_bom
from app.algorithms.bps_w_v2.steps.dn_calculator import calculate_dn
from app.algorithms.bps_w_v2.steps.fluid_properties import interpolate_fluid
from app.algorithms.bps_w_v2.steps.hydraulics import (
    build_curve_payload,
    find_working_point,
)
from app.algorithms.bps_w_v2.steps.pump_filter import passes_pump_filter, score_pump
from app.algorithms.bps_w_v2.steps.viscosity import apply_viscosity_correction
from app.algorithms.bps_w_v2.validators import validate_input
from app.core.config import settings


def _profile_dir() -> Path:
    return settings.profile_dir


class BpsWV2Algorithm:
    name = "bps_w_v2"

    def _rules(self) -> dict[str, Any]:
        rules = load_algorithm_rules(_profile_dir())
        profile_rules = rules.get("rules", {})
        if profile_rules.get("manufacturer"):
            rules.setdefault("rules", {})["manufacturer"] = profile_rules["manufacturer"]
        return rules

    async def match_pumps(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        db: Any,
    ) -> list[dict[str, Any]]:
        rules = self._rules()
        mf = rules.get("rules", {}).get("manufacturer") or rules.get("manufacturer")
        inp = map_parameters(parameters, mf=mf)
        validate_input(inp, rules)

        catalog = await db.get_pump_catalog(
            product_line, mf=inp.mf, pump_type=inp.pump_type
        )
        if not catalog:
            catalog = await db.get_pump_catalog(product_line)

        den, mu = await interpolate_fluid(db, inp.med, inp.c, inp.t)
        denw = 998.0

        ranked: list[dict[str, Any]] = []
        steps = rules.get("enabled_steps", {}).get("match_pumps", [])

        for pump in catalog:
            raw_curves = await db.get_pump_curves(pump["id"])
            curves = dict(raw_curves)
            if "apply_viscosity_correction" in steps and inp.med != "вода":
                curves = apply_viscosity_correction(
                    curves, pump, inp.med, den, mu, rules
                )

            qw = curves.get("Qw") or []
            hw = curves.get("Hw") or []
            wp = find_working_point(qw, hw, inp.Q, inp.H, inp.Hst)
            if "filter_by_operating_range" in steps and not passes_pump_filter(
                inp, pump, wp, rules
            ):
                continue

            payload = build_curve_payload(
                curves, wp, inp.Q, inp.H, inp.Hst, inp.n1
            )
            ranked.append(
                {
                    "id": pump["id"],
                    "name": pump["name"],
                    "score": round(score_pump(pump, inp, wp), 4),
                    "powerKw": pump.get("power_kw"),
                    "nominal_flow": pump.get("nominal_flow"),
                    "nominal_head": pump.get("nominal_head"),
                    "workingPoint": wp,
                    "rulesVersion": rules.get("version", 1),
                    "fluid": {"den": den, "mu": mu, "s": den / denw},
                    **payload,
                }
            )

        ranked.sort(key=lambda x: x["score"])
        top_n = int(rules.get("top_n") or rules.get("rules", {}).get("top_n") or 5)
        return ranked[:top_n]

    async def build_station(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        selected_pump_id: str,
        db: Any,
    ) -> dict[str, Any]:
        rules = self._rules()
        mf = rules.get("rules", {}).get("manufacturer") or rules.get("manufacturer")
        inp = map_parameters(parameters, mf=mf)
        validate_input(inp, rules)
        pump = await db.get_pump_by_id(selected_pump_id)

        dn_info = await calculate_dn(inp, db, rules)
        options = {
            k: parameters[k]
            for k in parameters
            if k
            in (
                "pn",
                "control",
                "filter",
                "connection",
                "reliefValve",
                "vibrationMounts",
                "insulation",
                "expansionTank",
                "housing",
                "collectorMaterial",
            )
        }
        bom = await generate_bom(inp, db, options, rules)

        configuration = {
            "station_type": inp.station_type,
            "series": inp.series,
            "workingPumps": inp.n1,
            "reservePumps": inp.n2,
            "flowRate": inp.Q,
            "head": inp.H,
            "staticHead": inp.Hst,
            "guaranteedHead": inp.Hgr,
            "fluid": inp.med,
            "temperature": inp.t,
            "concentration": inp.c,
            "pump_type": inp.pump_type,
            "DN": dn_info["DN"],
            "velocity": dn_info["velocity"],
            "bom": bom,
            "options": options,
            "selectedPump": pump,
            "rulesVersion": rules.get("version", 1),
        }
        summary = (
            f"{pump.get('name', selected_pump_id)} — {inp.n1}+{inp.n2} насосов, "
            f"DN {dn_info['DN']} мм"
        )
        return {
            "selectionId": str(uuid4()),
            "configuration": configuration,
            "summary": summary,
            "DN": dn_info,
            "bom": bom,
        }
