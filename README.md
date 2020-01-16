
docker build -t ml_webapp .
docker run -d -p 8000:8000 --env-file=.env --mount type=bind,source=/media/datadrive/medlines,target=/media/datadrive/medlines  --name medlines-web ml_webapp 

# Starting python services: 

- python -m inject -r service [API]
- python -m inject -r ocr [OCR engine + Spellchecker]
- python -m inject -r pretag [pretagging for NER]

# Workflow status: 
* 0 = Document is stored on the server
* 1 = Document is pre-processed (PDF -> TIFF / thumbnails)
* 2 = Document is processed to detect the text-body with CV-model
* 3 = Document is OCR`ed and spellchecked. 
* 4 = Document is pre-labeled.

# textembeddings demo 
docker run --name text_embeddings  -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node"  -d shantanuo/textembeddings
XXXX@HOST:~/text-embeddings/trial$ python main_spacy_Fallbuch.py


# Demo

5deef4212b1a6126a46ce81d
5deef42b2b1a6126a46ce825
5def62e82b1a6126a46ce82f


# DEV : 

Webapp: 5def63dd2b1a6126a46ce86d