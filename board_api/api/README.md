# Gym Tracker API

Gym Tracker is a Django-based API designed to store and track your gym progress. 
This backend application allows you to manage users, workouts, and progress data.

## Installation

Follow these steps to set up the Gym Tracker API on your local Windows machine:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/arriagaamin/gym-tracker-api.git
   cd gym-tracker-api
   ```

2. **Create a Virtual Environment**

   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment**

   ```bash
   venv\Scripts\activate
   ```

4. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

5. **Apply Migrations**

   ```bash
   python manage.py migrate
   ```

6. **Run the Development Server**

   ```bash
   python manage.py runserver
   ```

The API will be available at `http://127.0.0.1:8000/api/`.

## API Endpoints

All API endpoints are prefixed with `HOST/api/`. Below are some examples:

- `GET /api/user`: Retrieve all users.
- `POST /api/user`: Create a new user.
- `POST /api/user/<id:str>`: Update a user

Refer to the API documentation for a complete list of endpoints and their functionalities.

## Manage.py Commands

Django's `manage.py` provides several useful commands for managing your project:

- `python manage.py migrate`: Apply database migrations.
- `python manage.py makemigrations`: Create new migrations based on model changes.
- `python manage.py runserver`: Start the development server.
- `python manage.py shell`: Open a Python shell with the Django environment.

## Testing

To ensure the reliability and functionality of the Gym Tracker API, we have included a
suite of tests. Follow these steps to run the tests:

1. **Run Tests**

   ```bash
   python manage.py test
   ```

This command will execute all the tests in the project, providing feedback on any issues or failures.

2. **Writing Tests**

   - Tests are located in the `api/tests` directory.
   - Use Django's `TestCase` class to create test cases.
   - Ensure that each feature or functionality has corresponding tests to verify its behavior.

3. **Coverage**

   - To check test coverage, you can use a tool like `coverage.py`. Install it using:

     ```bash
     pip install coverage
     ```

   - Run the tests with coverage:

     ```bash
     coverage run --source='./api' manage.py test
     ```

   - Generate a coverage report:

     ```bash
     coverage report
     ```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to reach out if you have any questions or need further assistance!
