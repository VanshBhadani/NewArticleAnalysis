"""
NewsPulse AI — Spark ML Feature Engineering Pipeline
Constructs distributed text feature transformation stages.
"""

from typing import List, Any
from pyspark.ml.feature import (
    RegexTokenizer,
    StopWordsRemover,
    HashingTF,
    IDF
)


def create_feature_pipeline_stages(
    input_col: str = "text",
    num_features: int = 5000,
    min_doc_freq: int = 1
) -> List[Any]:
    """
    Constructs a robust text feature extraction pipeline:
    1. RegexTokenizer: splits text into clean alphanumeric word tokens.
    2. StopWordsRemover: strips English stop words.
    3. HashingTF: hashes tokens to a bounded term frequency vector.
    4. IDF: calculates inverse document frequency weights across the corpus.
    """
    tokenizer = RegexTokenizer(
        inputCol=input_col,
        outputCol="tokens",
        pattern=r"\W+",
        toLowercase=True,
        minTokenLength=3
    )

    remover = StopWordsRemover(
        inputCol="tokens",
        outputCol="filtered_tokens"
    )

    hashing_tf = HashingTF(
        inputCol="filtered_tokens",
        outputCol="raw_features",
        numFeatures=num_features
    )

    idf = IDF(
        inputCol="raw_features",
        outputCol="features",
        minDocFreq=min_doc_freq
    )

    return [tokenizer, remover, hashing_tf, idf]
