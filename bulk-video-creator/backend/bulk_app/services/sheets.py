# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Google Sheets API access for Bulk Video Creator.

Authentication uses Application Default Credentials with the spreadsheets
scope. The identity (user or service account) must have edit access to the
sheet. See README.md for how to grant it.
"""

import logging
from typing import Any

import google.auth
from google.auth.transport import requests as auth_requests
from googleapiclient import discovery

logger = logging.getLogger(__name__)

SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
# Columns read and written by the bulk. Wider sheets are truncated to A:Z.
LAST_COLUMN = "Z"
ROWS_PER_WRITE_BATCH = 5


def column_letter(index: int) -> str:
  """Converts a 0-based column index to its A1 letter.

  Args:
      index: 0-based column index.

  Returns:
      The column letter: 0 -> A, 25 -> Z, 26 -> AA.
  """
  letters = ""
  index += 1
  while index:
    index, remainder = divmod(index - 1, 26)
    letters = chr(ord("A") + remainder) + letters
  return letters


def quote_sheet_title(title: str) -> str:
  """Quotes a sheet title for A1 notation ('My sheet'!A1).

  Args:
      title: The sheet (tab) title.

  Returns:
      The title in single quotes, with inner quotes escaped.
  """
  return "'" + title.replace("'", "''") + "'"


class GoogleSheetsService:
  """Client that reads rows from and appends results to a sheet's first tab."""

  def __init__(self) -> None:
    credentials, _ = google.auth.default(scopes=SHEETS_SCOPES)
    credentials.refresh(auth_requests.Request())
    if hasattr(credentials, "service_account_email"):
      logger.info("Sheets API using a service account identity")
    else:
      logger.info(
          "Sheets API using user credentials; the user must have access to"
          " the sheet"
      )
    self._sheets = discovery.build(
        "sheets", "v4", credentials=credentials, cache_discovery=False
    )

  def _first_sheet_title(self, spreadsheet_id: str) -> str:
    """Returns the title of the first tab of a spreadsheet.

    Args:
        spreadsheet_id: The spreadsheet id.

    Returns:
        The title of the first tab.

    Raises:
        ValueError: If the spreadsheet has no tabs.
    """
    spreadsheet = (
        self._sheets.spreadsheets()
        .get(spreadsheetId=spreadsheet_id, fields="sheets.properties.title")
        .execute()
    )
    sheets = spreadsheet.get("sheets") or []
    if not sheets:
      raise ValueError("No sheets found in the spreadsheet")
    return sheets[0]["properties"]["title"]

  def get_rows(self, spreadsheet_id: str) -> list[dict[str, Any]]:
    """Returns the data rows of the first tab as dicts keyed by header.

    Args:
        spreadsheet_id: The spreadsheet id.

    Returns:
        One dict per data row (header row excluded). Short rows are padded
        with empty strings.
    """
    title = quote_sheet_title(self._first_sheet_title(spreadsheet_id))
    result = (
        self._sheets.spreadsheets()
        .values()
        .get(
            spreadsheetId=spreadsheet_id,
            range=f"{title}!A:{LAST_COLUMN}",
            valueRenderOption="FORMATTED_VALUE",
        )
        .execute()
    )
    values = result.get("values", [])
    if not values:
      return []

    headers = [str(header).strip() for header in values[0]]
    rows = []
    for row in values[1:]:
      padded = list(row) + [""] * (len(headers) - len(row))
      rows.append(dict(zip(headers, padded)))
    logger.info("Read %d data rows from sheet", len(rows))
    return rows

  def append_to_rows(
      self, spreadsheet_id: str, row_updates: list[dict[str, Any]]
  ) -> None:
    """Appends values to cells of several rows, batching API calls.

    Existing cell content is preserved: the new value is appended after the
    given separator. Values are written as RAW text so content coming from
    the sheet or from error messages is never evaluated as a formula.

    Args:
        spreadsheet_id: The spreadsheet id.
        row_updates: Items like
            {"row_index": 1, "updates": {"status": ("OK", separator)}}
            where row_index is 1-based over data rows (header excluded) and
            separator is the text placed between the old and new values.
    """
    if not row_updates:
      return

    title = quote_sheet_title(self._first_sheet_title(spreadsheet_id))
    header_result = (
        self._sheets.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=f"{title}!A1:{LAST_COLUMN}1")
        .execute()
    )
    headers = (header_result.get("values") or [[]])[0]
    column_indices = {
        str(header).strip(): i for i, header in enumerate(headers)
    }

    for start in range(0, len(row_updates), ROWS_PER_WRITE_BATCH):
      batch = row_updates[start : start + ROWS_PER_WRITE_BATCH]
      cells = []  # (a1 address, new value, separator)
      for item in batch:
        sheet_row = item["row_index"] + 1  # +1 for the header row.
        for column, (value, separator) in item["updates"].items():
          if column not in column_indices:
            logger.warning("Column %s not found in sheet, skipping", column)
            continue
          address = (
              f"{title}!{column_letter(column_indices[column])}{sheet_row}"
          )
          cells.append((address, value, separator))
      if not cells:
        continue

      read = (
          self._sheets.spreadsheets()
          .values()
          .batchGet(
              spreadsheetId=spreadsheet_id, ranges=[cell[0] for cell in cells]
          )
          .execute()
      )
      existing = []
      for value_range in read.get("valueRanges", []):
        values = value_range.get("values") or [[""]]
        existing.append(str(values[0][0]) if values[0] else "")
      existing += [""] * (len(cells) - len(existing))

      data = []
      for (address, value, separator), old in zip(cells, existing):
        final = f"{old}{separator}{value}" if old.strip() else value
        data.append({"range": address, "values": [[final]]})

      self._sheets.spreadsheets().values().batchUpdate(
          spreadsheetId=spreadsheet_id,
          body={"valueInputOption": "RAW", "data": data},
      ).execute()
      logger.info("Updated %d cells in %d rows", len(data), len(batch))
