"""
Disaster News Classifier using BERT model.
Implements lazy loading to prevent startup crashes.
"""
import logging
import re
import os
from typing import List, Optional, Dict, Any
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)

class DisasterNewsClassifier:
    """
    Singleton-pattern ML classifier for disaster news prediction.
    Uses lazy loading to prevent startup crashes.
    """
    _instance: Optional['DisasterNewsClassifier'] = None
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not DisasterNewsClassifier._initialized:
            self.model = None
            self.tokenizer = None
            self.model_path = Path(__file__).parent / "fake_news_model"
            DisasterNewsClassifier._initialized = True
            logger.info("DisasterNewsClassifier instance created (lazy loading enabled)")
    
    def _load_model(self):
        """Lazy load the model and tokenizer on first prediction request."""
        if self.model is not None:
            logger.info("Model already loaded, skipping...")
            return
        
        try:
            logger.info("="*60)
            logger.info("STARTING MODEL LOAD")
            logger.info("="*60)
            
            # Set TensorFlow to use legacy Keras for compatibility
            os.environ["TF_USE_LEGACY_KERAS"] = "1"
            logger.info("Set TF_USE_LEGACY_KERAS=1")
            
            import tensorflow as tf
            from tensorflow import keras
            from transformers import BertTokenizer
            
            logger.info(f"TensorFlow version: {tf.__version__}")
            logger.info(f"Keras version: {keras.__version__}")
            
            model_file = self.model_path / "model.h5"
            logger.info(f"Model path: {model_file}")
            logger.info(f"Model exists: {model_file.exists()}")
            
            if not model_file.exists():
                raise FileNotFoundError(
                    f"Model file not found: {model_file}\n"
                    f"Please copy the .h5 file to {self.model_path}/"
                )
            
            logger.info(f"Loading BERT model from {model_file}...")
            
            # Custom objects for TensorFlow Hub layers - required for KerasLayer
            import tensorflow_hub as hub
            logger.info(f"TensorFlow Hub version: {hub.__version__}")
            custom_objects = {'KerasLayer': hub.KerasLayer}
            
            self.model = keras.models.load_model(
                str(model_file),
                compile=False,
                custom_objects=custom_objects
            )
            
            logger.info(f"Model loaded! Type: {type(self.model)}")
            logger.info(f"Model inputs: {len(self.model.inputs)}")
            logger.info(f"Model outputs: {len(self.model.outputs)}")
            
            logger.info("Loading BERT tokenizer...")
            self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
            logger.info(f"Tokenizer loaded! Vocab size: {len(self.tokenizer)}")
            
            logger.info("="*60)
            logger.info("MODEL LOAD COMPLETE ✓")
            logger.info("="*60)
            
        except Exception as e:
            logger.error("="*60)
            logger.error("!!! MODEL LOAD FAILED !!!")
            logger.error("="*60)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}", exc_info=True)
            raise RuntimeError(f"ML Model initialization failed: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and preprocess text for prediction.
        Ported from preprocessor.py logic.
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove HTML tags
        text = re.sub(r'<.*?>', '', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^a-zA-Z0-9\s.,!?;:\'-]', ' ', text)
        
        # Remove extra whitespaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def predict(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Predict whether news articles are REAL or FAKE.
        
        Args:
            texts: List of news article texts (title + description)
        
        Returns:
            List of dicts with keys: 'text', 'prediction', 'confidence'
            prediction: 'REAL' or 'FAKE'
            confidence: float between 0 and 1
        """
        # Lazy load model on first call
        self._load_model()
        
        if not texts:
            return []
        
        try:
            # Clean all texts
            cleaned_texts = [self._clean_text(text) for text in texts]
            
            logger.info(f"Running prediction on {len(texts)} articles")
            
            # Tokenize texts
            max_length = 128  # Standard BERT sequence length
            
            encoded = self.tokenizer.batch_encode_plus(
                cleaned_texts,
                add_special_tokens=True,
                max_length=max_length,
                padding='max_length',
                truncation=True,
                return_attention_mask=True,
                return_token_type_ids=True,
                return_tensors='tf'
            )
            
            input_ids = encoded['input_ids']
            attention_masks = encoded['attention_mask']
            token_type_ids = encoded.get('token_type_ids')
            
            # Handle different model input requirements
            import tensorflow as tf
            if token_type_ids is None:
                token_type_ids = tf.zeros_like(input_ids)
            
            # Predict based on model input count
            expected_inputs = len(self.model.inputs)
            
            if expected_inputs >= 3:
                predictions = self.model.predict(
                    [input_ids, attention_masks, token_type_ids], 
                    verbose=0
                )
            elif expected_inputs == 2:
                predictions = self.model.predict(
                    [input_ids, attention_masks], 
                    verbose=0
                )
            else:
                predictions = self.model.predict(input_ids, verbose=0)
            
            # Format results
            results = []
            for idx, (text, pred) in enumerate(zip(texts, predictions)):
                # Extract probability
                if isinstance(pred, (list, np.ndarray)):
                    if len(pred) == 1:
                        # Binary sigmoid output
                        prob_real = float(pred[0])
                        prob_fake = 1.0 - prob_real
                    elif len(pred) == 2:
                        # Softmax [FAKE, REAL]
                        prob_fake = float(pred[0])
                        prob_real = float(pred[1])
                    else:
                        prob_real = 0.5
                        prob_fake = 0.5
                else:
                    prob_real = float(pred)
                    prob_fake = 1.0 - prob_real
                
                # Normalize
                total = prob_fake + prob_real
                if total > 0:
                    prob_fake /= total
                    prob_real /= total
                
                # Determine label
                if prob_fake > prob_real:
                    prediction_label = "FAKE"
                    confidence = prob_fake
                else:
                    prediction_label = "REAL"
                    confidence = prob_real
                
                results.append({
                    'text': text,
                    'prediction': prediction_label,
                    'confidence': float(confidence)
                })
            
            logger.info(f"Prediction completed: {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}", exc_info=True)
            raise RuntimeError(f"ML Prediction failed: {str(e)}")


# Global singleton instance for easy import
classifier = DisasterNewsClassifier()
