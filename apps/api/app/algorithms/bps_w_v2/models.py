from pydantic import BaseModel, Field


class SelectionInputV2(BaseModel):
    station_type: str = "BPS-W"
    series: str = "Pro"
    Q: float = Field(gt=0)
    H: float = Field(gt=0)
    Hst: float = Field(default=0, ge=0)
    Hgr: float = Field(default=0, ge=0)
    n1: int = Field(default=1, ge=1)
    n2: int = Field(default=1, ge=0)
    med: str = "вода"
    c: int = Field(default=100, ge=0, le=100)
    t: int = Field(default=20, ge=5, le=70)
    pump_type: str = "COMOS"
    mf: str | None = None
    include_piping_losses: bool = False

    @property
    def n(self) -> int:
        return self.n1 + self.n2
