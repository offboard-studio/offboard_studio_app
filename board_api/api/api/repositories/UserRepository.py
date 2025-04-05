from typing import Type

from api.models import User

from .BaseRepository import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User