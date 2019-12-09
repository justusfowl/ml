docker run -d -p 8000:8000 --env-file=.env --mount type=bind,source=/media/datadrive/medlines,target=/media/datadrive/medlines --name medlines-web ml_webapp 
