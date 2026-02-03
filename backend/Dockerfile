FROM python:3.13-slim

# Allow statements and log messages to immediately appear in the logs
ENV PYTHONUNBUFFERED True

WORKDIR /code

RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

COPY requirements.txt /code/requirements.txt

RUN pip install --upgrade pip

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY app /code/app

ENV PYTHONPATH "${PYTHONPATH}:/code/app"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]