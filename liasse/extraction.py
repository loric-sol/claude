import json
import os
from abc import ABC, abstractmethod
from decimal import Decimal
from pathlib import Path
from typing import Optional

from .models import K1Data


def _to_decimal(value) -> Optional[Decimal]:
    if value is None or value == "":
        return None
    return Decimal(str(value))


class K1Extractor(ABC):
    @abstractmethod
    def extract(self, source: Path) -> K1Data:
        ...


class MockK1Extractor(K1Extractor):
    """Reads a JSON fixture shaped like a vendor API response.

    This is the stand-in for Lido/K1x while you don't have API access yet.
    Everything downstream only depends on the K1Data this returns, so
    swapping in LidoK1Extractor/K1xExtractor later is a one-line change in
    cli.py, not a rewrite.
    """

    def extract(self, source: Path) -> K1Data:
        data = json.loads(Path(source).read_text())
        return K1Data(
            partner_name=data["partner_name"],
            partnership_name=data["partnership_name"],
            partnership_ein=data["partnership_ein"],
            tax_year=int(data["tax_year"]),
            beginning_capital_account=_to_decimal(data.get("beginning_capital_account")),
            ending_capital_account=_to_decimal(data.get("ending_capital_account")),
            client_email=data.get("client_email"),
        )


class LidoK1Extractor(K1Extractor):
    """Real extraction via Lido's API.

    The endpoint and payload shape below are placeholders — update them to
    match Lido's actual API docs once you have credentials. Requires the
    `requests` package and a LIDO_API_KEY environment variable.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("LIDO_API_KEY")
        if not self.api_key:
            raise RuntimeError("LIDO_API_KEY is not set")

    def extract(self, source: Path) -> K1Data:
        import requests

        with open(source, "rb") as fh:
            response = requests.post(
                "https://api.lido.tax/v1/k1/extract",  # placeholder — confirm real endpoint
                headers={"Authorization": f"Bearer {self.api_key}"},
                files={"file": fh},
                timeout=60,
            )
        response.raise_for_status()
        payload = response.json()
        return K1Data(
            partner_name=payload["partner_name"],
            partnership_name=payload["partnership_name"],
            partnership_ein=payload["partnership_ein"],
            tax_year=int(payload["tax_year"]),
            beginning_capital_account=_to_decimal(payload.get("beginning_capital_account")),
            ending_capital_account=_to_decimal(payload.get("ending_capital_account")),
            client_email=payload.get("client_email"),
        )


class K1xExtractor(K1Extractor):
    """Real extraction via K1x's API.

    Same caveat as LidoK1Extractor: endpoint/payload shape is a placeholder
    until you have their docs and credentials. Requires the `requests`
    package and a K1X_API_KEY environment variable.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("K1X_API_KEY")
        if not self.api_key:
            raise RuntimeError("K1X_API_KEY is not set")

    def extract(self, source: Path) -> K1Data:
        import requests

        with open(source, "rb") as fh:
            response = requests.post(
                "https://api.k1x.io/v1/documents/extract",  # placeholder — confirm real endpoint
                headers={"Authorization": f"Bearer {self.api_key}"},
                files={"file": fh},
                timeout=60,
            )
        response.raise_for_status()
        payload = response.json()
        return K1Data(
            partner_name=payload["partner_name"],
            partnership_name=payload["partnership_name"],
            partnership_ein=payload["partnership_ein"],
            tax_year=int(payload["tax_year"]),
            beginning_capital_account=_to_decimal(payload.get("beginning_capital_account")),
            ending_capital_account=_to_decimal(payload.get("ending_capital_account")),
            client_email=payload.get("client_email"),
        )
