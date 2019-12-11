
# coding: utf-8

# In[ ]:


import numpy as np
from wand.image import Image as Img
import pandas as pd
import re
import os
import cv2
import pytesseract
from sklearn.neighbors import KernelDensity
from scipy.signal import argrelextrema
from numpy import linspace
import glob


# In[ ]:


BASE_PATH = "/home/uli/jupyternootebooks/pdwh/"
BASE_PATH = "/mnt/Daten/Daten Uli/Beruf/Praxis Erbach/Data Analytics/Frequenzstatistik/Honorarunterlagen"


FILE_TITLE_SUFFIX = 'kontoauszug.pdf'

all_files_pdf = []

for f in os.listdir(BASE_PATH):
    if f.lower().endswith(FILE_TITLE_SUFFIX):
        all_files_pdf.append(f)
                   
fn = 0


# In[ ]:


all_files_pdf


# In[ ]:


img = Img(filename=os.path.join(BASE_PATH, all_files_pdf[fn]), resolution=500)
img.type = 'grayscale'
img.compression_quality = 99
images = img.sequence
pages = len(images)
Img(images[0]).save(filename='title.jpg') # focus on first page only for this case


# In[ ]:


images


# In[ ]:


# get OCR-results as hocr
image = cv2.imread('title.jpg')      
text_str = pytesseract.image_to_data(image, lang = 'deu', config = '-psm 6')


# In[ ]:


def classify_doc(in_text):
    if text_str.find("Frequenz") > 0:
        return 1
    elif text_str.find("auszug") > 0 :
        return 2
    else: 
        return -1


# In[ ]:


doc_type = classify_doc(text_str)

print(doc_type)

if doc_type == 2 and pages > 1: 
    print("Warning - Kontoauszug mit mehr als zwei Seiten")


# In[ ]:



def process_hocr_string(text_str):                
   # convert strings to dataframe
   temp = text_str.split('\n')
   temp2 = [i.split('\t') for i in temp]
   df_temp = pd.DataFrame(temp2)
                           
   # first row as column names
   df_temp.columns = df_temp.iloc[0]
   df_temp = df_temp.reindex(df_temp.index.drop(0))        
   df = df_temp
           
   # convert to numeric
   df[['page_num', 'block_num', 'line_num', 'par_num', 'left', 'top', 'width', 'height', 'conf']] = df[['page_num', 'block_num', 'line_num', 'par_num', 'left', 'top', 'width', 'height', 'conf']].apply(pd.to_numeric)
          
   # delete all rows with empty text
   df = df.loc[df['text'] != ""]
   df = df[df.text.notnull()]
   return df

df = process_hocr_string(text_str)
df['line_new'] = df['page_num'] * 10000000 + df['block_num']*10000 + df['par_num'] * 100 + df['line_num'] # mögl. erkannte Blocke/Paragraphen werden ignoriert


# In[ ]:


df


# In[ ]:


header_row = df.loc[df['text'].str.contains("Beleg")]["line_new"].iloc[0]


# In[ ]:


header_col = df.loc[df["line_new"] == header_row]
header_col


# In[ ]:


cols = []
for i,c in header_col.iterrows():
    print(c["left"])
    cols.append(c["left"])


# In[ ]:


def get_col_index(cols, coords):
    flag_has_changed = False
    target_col_indx = len(cols)-1
    for i in range(len(cols)):
        if i+1 < len(cols):
            if (cols[i]-5) <= coords and coords <= (cols[i+1]+5): 
                target_col_indx = i
                flag_has_changed = True
        elif (cols[i]-5) <= coords and coords <= 99999: 
                target_col_indx = i
    return target_col_indx


# In[ ]:


df = df.loc[df["line_new"] >= header_row]

rows = df["line_new"].unique()

extr_tab = pd.DataFrame("", index=np.arange(0, len(pd.Series.unique(df['line_new']))), columns=np.arange(len(cols)))

for r in range(len(rows)): 
    
    df_row = df.loc[(df['line_new'].values == rows[r])]
    
    for index, df_r in df_row.iterrows():
        
        word_coord_left = df_r["left"]
        target_col = get_col_index(cols, word_coord_left)
        
        try:
            current_content = extr_tab.iloc[r,target_col]
        except: 
            current_content = ""
            
        # print("target_col: %s, r: %s, df_r: %s current_content: %s " % (target_col, r, df_r["text"], current_content))
            
        extr_tab.iat[r,target_col] = " ".join((str(current_content), str(df_r["text"])))
        


# ### Postprocessing

# In[ ]:


header = extr_tab.iloc[0]
extr_tab = extr_tab[1:]
extr_tab.rename(columns = header, inplace=True)

extr_tab.columns = extr_tab.columns.str.strip().str.replace(' ', '_').str.replace('(', '').str.replace(')', '')

extr_tab = extr_tab.loc[(((extr_tab['Belegdat.'] != "") | (extr_tab['Belegdat.'] != "") | (extr_tab['Belegtext'] != "")))]

extr_tab.loc[:, extr_tab.columns[3]] = extr_tab[extr_tab.columns[3]].str.replace(" ", "")
extr_tab.loc[:, extr_tab.columns[3]] = extr_tab[extr_tab.columns[3]].str.replace("-", "")
extr_tab.loc[:, extr_tab.columns[3]] = extr_tab[extr_tab.columns[3]].str.replace(".", "")
extr_tab.loc[:, extr_tab.columns[3]] = extr_tab[extr_tab.columns[3]].str.replace(",", ".")
extr_tab.loc[:, extr_tab.columns[3]] = extr_tab[extr_tab.columns[3]].str.replace(chr(8218), ".")

extr_tab.loc[:, extr_tab.columns[4]] = extr_tab[extr_tab.columns[4]].str.replace(" ", "")
extr_tab.loc[:, extr_tab.columns[4]] = extr_tab[extr_tab.columns[4]].str.replace("-", "")
extr_tab.loc[:, extr_tab.columns[4]] = extr_tab[extr_tab.columns[4]].str.replace(".", "")
extr_tab.loc[:, extr_tab.columns[4]] = extr_tab[extr_tab.columns[4]].str.replace(",", ".")
extr_tab.loc[:, extr_tab.columns[4]] = extr_tab[extr_tab.columns[4]].str.replace(chr(8218), ".")

num_cols = 2
if len(cols) == 6:
    num_cols = 3

extr_tab[extr_tab.columns[-num_cols:]] = extr_tab[extr_tab.columns[-num_cols:]].apply(pd.to_numeric)


# In[ ]:


def write_out(df, file_name): 
    output_file = file_name[:-4] + '.csv'
    df.to_csv(output_file, sep=';', encoding = 'utf-8-sig ', header = 0, index = 0)    

