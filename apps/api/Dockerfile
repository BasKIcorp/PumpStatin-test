FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir uv && uv pip install --system -e .
COPY app ./app
ENV APP_PROFILE_ID=default
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
