import re
import sys
from ftfy import fix_text

import os
import pandas as pd
import numpy as np
import spacy
from string_grouper import match_strings, match_most_similar, group_similar_strings, StringGrouper

def clean_text(string):
    string = fix_text(string) # fix text encoding issues
    string = string.encode("ascii", errors="ignore").decode() #remove non ascii chars
    string = string.lower() #make lower case
    chars_to_remove = [")","(","|","[","]","{","}","'"]
    rx = '[' + re.escape(''.join(chars_to_remove)) + ']'
    string = re.sub(rx, '', string) #remove the list of chars defined above
    string = string.title() # normalise case - capital at start of each word
    string = re.sub(' +',' ',string).strip() # get rid of multiple spaces and replace with a single space
    return string


from spacy.matcher import PhraseMatcher
nlp = spacy.blank('de')

text = "Für den unten stehenden Versicherten benötigen wir neue Verordnungen. Versicherter: Heinz Lorch (geb120.09.1936; ROSenstraße 9. 65343 Eltville am Rhein; Versichertennummer: V221991825) Auslaufende VO: Verordnung 21.10.2019 s 1.11.2019 Verordnete Behandlungspflege Wundversorgung Präparate Verband. Diagnose ist {Z32.3I}."
string = text.replace("\n", ' break ') # problems with processing '\n'

doc = nlp(string)

result = pd.read_csv("/opt/ml/inject/pretag_lookup.csv", sep=",", encoding = 'utf8', keep_default_na=False)

result.set_index("search", inplace=True)

shape_matcher = PhraseMatcher(nlp.vocab, attr="SHAPE")
shape_matcher.add("Date", None, nlp("23.09.1989"), nlp("23.09.89"), nlp("23. September 1989"), nlp("23. September 89"),
            nlp("10.04.1986"), nlp("10.04.86"), nlp("10. April 86"), nlp("10. April 1986"),
            nlp("11.01.1984"), nlp("11.01.84"), nlp("11. Januar 84"), nlp("11. Januar 1984"))

shape_matcher.add("ICD", None,
            nlp("B36.1G"), nlp("(B36.1G)"), nlp("{B36.1G}"), nlp("B36.1 G"), nlp("(B36.1 G)"), nlp("{B36.1 G}"),
            nlp("R06.0G"), nlp("(R06.0G)"), nlp("{R06.0G}"), nlp("R06.0 G"), nlp("(R06.0 G)"), nlp("{R06.0 G}"),
            nlp("I48.09G"), nlp("(I48.09G)"), nlp("{I48.09G}"), nlp("I48.09 G"), nlp("(I48.09 G)"), nlp("{I48.09 G}"),
            nlp("Z95.1Z"), nlp("(Z95.1Z)"), nlp("{Z95.1Z}"), nlp("Z95.1 Z"), nlp("(Z95.1 Z)"), nlp("{Z95.1 Z}"), nlp("Z95"), nlp("{Z82.I}"))


shape_matches = shape_matcher(doc)

entities_detected = []
words_detected = []

for m_id, start, end in shape_matches:
    entity = doc[start : end]
    words_detected.append(clean_text(entity.text))
    entities_detected.append((entity.text, entity.start_char, entity.end_char, nlp.vocab.strings[m_id], ""))
    print(entity.text)

req_words = []

for t in doc:
    if len(t.text) > 2 and t.text != "break" and not t.is_stop and not clean_text(t.text) in words_detected:
        print(t.text)
        req_words.append(t.text.lower())

# Create a small set of artifical company names
duplicates = pd.Series(pd.Series(req_words).unique())

string_words = pd.Series(result["Word"].unique())

# Create all matches:
matches = match_strings(string_words, duplicates, ngram_size=3, min_similarity=0.4)

print(matches)

