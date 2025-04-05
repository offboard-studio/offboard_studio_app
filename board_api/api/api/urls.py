from api.controllers import HealthCheckController, UserController

urlpatterns = [
    *HealthCheckController.get_paths(),
    *UserController.get_paths(),
]
