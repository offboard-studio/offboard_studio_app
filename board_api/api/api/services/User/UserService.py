from typing import Type
from api.models import User
from api.repositories import UserRepository
from api.services.BaseService import BaseService


class UserService(BaseService[User]):
    repository = UserRepository
