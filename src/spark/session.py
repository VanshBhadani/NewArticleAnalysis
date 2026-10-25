"""
NewsPulse AI — Spark Session Lifecycle & Configuration
Provides a controlled, cached SparkSession with Windows/Linux path handling and memory protection.
"""

import os
import sys
from typing import Dict, Any, Optional
from src.config import settings
from src.logging_config import logger

_SPARK_SESSION = None


def _configure_pyspark_environment():
    """Ensures python worker binaries and Hadoop winutils are safely resolved on Windows."""
    py_exec = sys.executable
    if sys.platform == "win32":
        try:
            import win32api
            py_exec = win32api.GetShortPathName(py_exec)
        except Exception:
            pass

        # Configure HADOOP_HOME for Windows local Spark file operations
        hadoop_dir = settings.base_dir / "hadoop"
        if (hadoop_dir / "bin" / "winutils.exe").exists():
            os.environ["HADOOP_HOME"] = str(hadoop_dir)
            hadoop_bin = str(hadoop_dir / "bin")
            if hadoop_bin not in os.environ.get("PATH", ""):
                os.environ["PATH"] = hadoop_bin + os.pathsep + os.environ.get("PATH", "")

    os.environ["PYSPARK_PYTHON"] = py_exec
    os.environ["PYSPARK_DRIVER_PYTHON"] = py_exec


def get_spark_session():
    """
    Returns an active, memory-conscious SparkSession singleton.
    Safely reuses existing session across Streamlit reruns.
    """
    global _SPARK_SESSION
    if _SPARK_SESSION is not None:
        try:
            # Check if underlying SparkContext is still alive
            if not _SPARK_SESSION.sparkContext._jsc.sc().isStopped():
                return _SPARK_SESSION
        except Exception:
            _SPARK_SESSION = None

    _configure_pyspark_environment()

    try:
        from pyspark.sql import SparkSession

        builder = (
            SparkSession.builder
            .appName(settings.spark_app_name)
            .master(settings.spark_master)
            .config("spark.driver.memory", settings.spark_driver_memory)
            .config("spark.sql.shuffle.partitions", "2")
            .config("spark.default.parallelism", "2")
            .config("spark.ui.enabled", "false")
            .config("spark.python.worker.reuse", "true")
            .config("spark.sql.execution.arrow.pyspark.enabled", "true")
        )

        spark = builder.getOrCreate()
        spark.sparkContext.setLogLevel(settings.spark_log_level)
        _SPARK_SESSION = spark
        logger.info(f"SparkSession created successfully (Version: {spark.version}, Master: {settings.spark_master})")
        return spark
    except Exception as e:
        logger.error(f"Failed to initialize SparkSession: {e}")
        raise RuntimeError(f"Could not initialize Apache Spark session: {e}") from e


def stop_spark_session():
    """Safely shuts down the active SparkSession."""
    global _SPARK_SESSION
    if _SPARK_SESSION is not None:
        try:
            _SPARK_SESSION.stop()
            logger.info("SparkSession stopped.")
        except Exception as e:
            logger.warning(f"Error stopping SparkSession: {e}")
        finally:
            _SPARK_SESSION = None


def get_spark_diagnostics() -> Dict[str, Any]:
    """Inspects and returns live runtime diagnostics for the Spark environment."""
    try:
        import pyspark
        spark_installed = True
        spark_version = pyspark.__version__
    except ImportError:
        spark_installed = False
        spark_version = "Not Installed"

    session_active = False
    master = "N/A"
    app_name = "N/A"
    jvm_version = "N/A"

    if _SPARK_SESSION is not None:
        try:
            sc = _SPARK_SESSION.sparkContext
            if not sc._jsc.sc().isStopped():
                session_active = True
                master = sc.master
                app_name = sc.appName
                jvm_version = sc._gateway.jvm.java.lang.System.getProperty("java.version")
        except Exception:
            session_active = False

    return {
        "spark_installed": spark_installed,
        "spark_version": spark_version,
        "session_active": session_active,
        "master": master,
        "app_name": app_name,
        "jvm_version": jvm_version,
        "python_executable": sys.executable
    }
