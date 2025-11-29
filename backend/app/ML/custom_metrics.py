"""
Custom metrics used by the trained Keras model.
"""

from __future__ import annotations

import tensorflow as tf
from keras import backend as K
from keras.saving import register_keras_serializable


@register_keras_serializable(package="custom_metrics")
def f1_score(y_true: tf.Tensor, y_pred: tf.Tensor) -> tf.Tensor:
    """
    Compute the F1 score for binary or multi-label classification.
    """
    y_true = tf.cast(tf.reshape(y_true, (-1,)), tf.float32)
    y_pred = tf.cast(tf.reshape(y_pred, (-1,)), tf.float32)
    y_pred = tf.round(tf.clip_by_value(y_pred, 0.0, 1.0))

    tp = tf.reduce_sum(y_true * y_pred)
    fp = tf.reduce_sum((1 - y_true) * y_pred)
    fn = tf.reduce_sum(y_true * (1 - y_pred))

    precision = tp / (tp + fp + K.epsilon())
    recall = tp / (tp + fn + K.epsilon())

    return 2 * (precision * recall) / (precision + recall + K.epsilon())


__all__ = ["f1_score"]



