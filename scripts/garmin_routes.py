#!/usr/bin/env python3

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))

from garmin_lib import fetch_route_points


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--activity-type", default="running")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        payload = fetch_route_points(
            args.email,
            args.password,
            args.limit,
            args.activity_type,
        )
        print(json.dumps(payload))
        return 0
    except Exception as error:  # noqa: BLE001
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
