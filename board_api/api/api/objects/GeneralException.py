from dataclasses import dataclass
from typing import List
from .Response import Response


@dataclass
class GeneralException(Exception):
    """
    General exception class for handling exceptions in the API
    
    See the Exception Codes in the file: api/utils/Exceptions.csv
    """
    code: int
    messages: List[str]

    def to_response(self):
        return Response(
            code=self.code,
            error=True,
            messages=self.messages,
            data=None
        )
