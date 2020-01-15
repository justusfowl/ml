FROM python:3.6

COPY . /app
WORKDIR /app
RUN pip install --trusted-host pypi.python.org -r requirements.txt
RUN pip install spacy
RUN pip install torch===1.3.1 torchvision===0.4.2 -f https://download.pytorch.org/whl/torch_stable.html

CMD python __main__.py --routines service
