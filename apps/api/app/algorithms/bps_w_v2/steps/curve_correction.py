"""Пересчёт кривых насоса для вязких сред (ТЗ 2.2.3)."""

from __future__ import annotations

from app.algorithms.bps_w_v2.steps.viscosity import apply_viscosity_correction

__all__ = ["apply_viscosity_correction"]
