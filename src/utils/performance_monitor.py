"""Performance monitoring utilities for GMShoot application."""

import time
import psutil
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from functools import wraps
from threading import Lock
import json
from pathlib import Path

from .logging import get_logger

logger = get_logger("performance_monitor")


class PerformanceMonitor:
    """Monitors application performance metrics."""
    
    def __init__(self):
        """Initialize performance monitor."""
        self.start_time = time.time()
        self.metrics = {
            'requests': 0,
            'errors': 0,
            'processing_times': [],
            'memory_usage': [],
            'cpu_usage': [],
            'response_times': []
        }
        self.lock = Lock()
        self.last_report_time = time.time()
        self.report_interval = 60  # Report every 60 seconds
    
    def track_request(self) -> None:
        """Track a new request."""
        with self.lock:
            self.metrics['requests'] += 1
    
    def track_error(self, error_type: str, error_message: str = "") -> None:
        """Track a new error."""
        with self.lock:
            self.metrics['errors'] += 1
            logger.error(f"Error tracked: {error_type} - {error_message}")
    
    def track_processing_time(self, operation: str, duration: float) -> None:
        """Track processing time for an operation."""
        with self.lock:
            self.metrics['processing_times'].append({
                'operation': operation,
                'duration': duration,
                'timestamp': datetime.now().isoformat()
            })
            logger.debug(f"Processing time tracked: {operation} - {duration:.3f}s")
    
    def track_memory_usage(self) -> None:
        """Track current memory usage."""
        with self.lock:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)  # Convert to MB
            
            self.metrics['memory_usage'].append({
                'memory_mb': memory_mb,
                'timestamp': datetime.now().isoformat()
            })
            logger.debug(f"Memory usage tracked: {memory_mb:.2f} MB")
    
    def track_cpu_usage(self) -> None:
        """Track current CPU usage."""
        with self.lock:
            cpu_percent = psutil.cpu_percent(interval=1)
            
            self.metrics['cpu_usage'].append({
                'cpu_percent': cpu_percent,
                'timestamp': datetime.now().isoformat()
            })
            logger.debug(f"CPU usage tracked: {cpu_percent:.1f}%")
    
    def track_response_time(self, endpoint: str, response_time: float) -> None:
        """Track API response time."""
        with self.lock:
            self.metrics['response_times'].append({
                'endpoint': endpoint,
                'response_time': response_time,
                'timestamp': datetime.now().isoformat()
            })
            logger.debug(f"Response time tracked: {endpoint} - {response_time:.3f}s")
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of performance metrics."""
        with self.lock:
            current_time = time.time()
            uptime = current_time - self.start_time
            
            # Calculate averages
            avg_processing_time = 0
            if self.metrics['processing_times']:
                avg_processing_time = sum(p['duration'] for p in self.metrics['processing_times']) / len(self.metrics['processing_times'])
            
            avg_memory = 0
            if self.metrics['memory_usage']:
                avg_memory = sum(p['memory_mb'] for p in self.metrics['memory_usage']) / len(self.metrics['memory_usage'])
            
            avg_cpu = 0
            if self.metrics['cpu_usage']:
                avg_cpu = sum(p['cpu_percent'] for p in self.metrics['cpu_usage']) / len(self.metrics['cpu_usage'])
            
            avg_response_time = 0
            if self.metrics['response_times']:
                avg_response_time = sum(p['response_time'] for p in self.metrics['response_times']) / len(self.metrics['response_times'])
            
            summary = {
                'uptime_seconds': uptime,
                'requests': self.metrics['requests'],
                'errors': self.metrics['errors'],
                'avg_processing_time': avg_processing_time,
                'avg_memory_mb': avg_memory,
                'avg_cpu_percent': avg_cpu,
                'avg_response_time': avg_response_time,
                'total_processing_times': len(self.metrics['processing_times']),
                'total_memory_samples': len(self.metrics['memory_usage']),
                'total_cpu_samples': len(self.metrics['cpu_usage']),
                'total_response_times': len(self.metrics['response_times'])
            }
            
            return summary
    
    def save_metrics_report(self, filepath: Optional[str] = None) -> str:
        """Save performance metrics report to file."""
        with self.lock:
            try:
                summary = self.get_metrics_summary()
                summary['report_generated_at'] = datetime.now().isoformat()
                
                if filepath is None:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filepath = f"performance_report_{timestamp}.json"
                
                # Create directory if it doesn't exist
                report_dir = Path("reports")
                report_dir.mkdir(exist_ok=True)
                
                with open(report_dir / filepath, 'w') as f:
                    json.dump(summary, f, indent=2)
                
                logger.info(f"Performance report saved to: {filepath}")
                return str(report_dir / filepath)
                
            except Exception as e:
                logger.error(f"Failed to save performance report: {e}")
                raise
    
    def should_generate_report(self) -> bool:
        """Check if it's time to generate a new report."""
        current_time = time.time()
        return current_time - self.last_report_time >= self.report_interval


def monitor_performance(func):
    """Decorator to monitor function performance."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            global_performance_monitor.track_processing_time(func.__name__, duration)
            return result
        except Exception as e:
            global_performance_monitor.track_error(type(e).__name__, str(e))
            raise
    return wrapper


def start_background_monitoring(interval: int = 30) -> None:
    """Start background performance monitoring."""
    def monitor_loop():
        while True:
            global_performance_monitor.track_memory_usage()
            global_performance_monitor.track_cpu_usage()
            time.sleep(interval)
    
    import threading
    monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitor_thread.start()
    logger.info(f"Background performance monitoring started with {interval}s interval")


# Global performance monitor instance
global_performance_monitor = PerformanceMonitor()