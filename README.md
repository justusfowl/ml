
docker build -t ml_webapp .
docker run -d -p 8000:8000 --env-file=.env --mount type=bind,source=/media/datadrive/medlines,target=/media/datadrive/medlines  --name medlines-web ml_webapp 

# Starting python services: 

WEBSERVICE
[API]
- python -m inject -r service 

WORKER SERVICES
[OCR engine + Spellchecker] / [pretagging for NER]
- python -m inject -r ocr 
- python -m inject -r pretag 

LOADER-VARIANTS: 
Load objects into the pipeline. 
Optional flag to set the latest wfstep; multiple steps possible, no WF step skipping allowed: --wfsteps ocr pretag 


PATLOADER 
[Load patient data from defined directory(ies). Folder structure needs to comply with.
Allowed formats: 
* PDF
* TIFF (will be converted into PDF)
]

- base_directory
-- Patient_Folder format: "{NUMBER@NAME}"
--- "Briefe"
---- Letter_Folder: "{DOC_NAME}"

- python -m inject --routines patloader -d {BASE_DIR_OF_DATA} --fromdir

LOADER
[bluntly loading pdf files into the pipeline from directories]
Allowed formats: 
* PDF
]

PROCESSLOADER 
[Load individual objects by Id]
- python -m inject --routines loader --fromdb --objId {OBJECT_IDS}


# Workflow status: 
* 0 : PDF / File injected, thumbnails created and stored into the mongoDB (PDF -> TIFF / thumbnails)
* 1 : Pages have bounding boxes for text body (either manually or through the CV model)
* --> [-1] --> Object disregarded, no doc letter / relevant text for model training
* 2 : Text has been extracted per page based on the bounding boxes (read_text_raw); spell checking has been applied (read_text)
* 3 : Prelabeling NER has been applied
* --> [-3] --> Object disregarded, e.g. because of text spell check errors / irrelevance
* 4 : Approved NER labeling


# textembeddings demo 
docker run --name text_embeddings  -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node"  -d shantanuo/textembeddings
XXXX@HOST:~/text-embeddings/trial$ python main_spacy_Fallbuch.py


# Demo

5deef4212b1a6126a46ce81d
5deef42b2b1a6126a46ce825
5def62e82b1a6126a46ce82f


# DEV : 

Webapp: 5def63dd2b1a6126a46ce86d