from django.http import HttpRequest
from rest_framework import status
from rest_framework.response import Response as RestResponse

from api.controllers.BaseController import BaseController, controller, endpoint
from api.objects import Response
from api.objects.User import UserSerializer
from api.repositories import UserRepository


@controller(route="user", name="User")
class UserController(BaseController):

    @staticmethod
    @endpoint(route="", methods=["GET"])
    def get_all(http_request: HttpRequest):
        return RestResponse(
            status=status.HTTP_200_OK,
            data=Response(
                code=0,
                error=False,
                messages=[f"Success"],
                data=UserSerializer(UserRepository.all(), many=True).data,
            ).to_dict(),
        )
