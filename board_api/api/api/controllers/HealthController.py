from django.http import HttpRequest
from rest_framework import status
from rest_framework.response import Response as RestResponse

from api.controllers.BaseController import BaseController, controller, endpoint


@controller(route="healthcheck", name="HealthCheck")
class HealthCheckController(BaseController):

    @staticmethod
    @endpoint(route="", methods=["GET"])
    def healthcheck(http_request: HttpRequest):
        return RestResponse(status=status.HTTP_200_OK)
