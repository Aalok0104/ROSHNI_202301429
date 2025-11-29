"""
Performance testing script for the ML prediction API.

This script measures:
- Response time per request
- Throughput (requests per second)
- Latency statistics (min, max, mean, median)

Usage:
    python test_performance.py [--url URL] [--requests N] [--concurrent N]
    
Examples:
    # Basic performance test (10 requests, sequential)
    python test_performance.py
    
    # Test with 100 requests, 5 concurrent
    python test_performance.py --requests 100 --concurrent 5
"""

import argparse
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests
from PIL import Image


def create_test_image(output_path: Path, size: tuple[int, int] = (224, 224)) -> Path:
    """Create a simple test image."""
    img = Image.new("RGB", size, color=(128, 128, 128))
    img.save(output_path)
    return output_path


def make_prediction_request(
    url: str, image_path: Path, request_id: int
) -> tuple[int, float, dict[str, Any] | None, Exception | None]:
    """
    Make a single prediction request and measure its latency.
    
    Returns:
        Tuple of (request_id, latency_seconds, response_json, error)
    """
    endpoint = f"{url}/predict"
    start_time = time.time()
    
    try:
        with open(image_path, "rb") as f:
            files = {"file": (image_path.name, f, "image/jpeg")}
            response = requests.post(endpoint, files=files, timeout=60)
        
        response.raise_for_status()
        latency = time.time() - start_time
        return (request_id, latency, response.json(), None)
    
    except Exception as e:
        latency = time.time() - start_time
        return (request_id, latency, None, e)


def run_performance_test(
    url: str = "http://localhost:8000",
    num_requests: int = 10,
    concurrent: int = 1,
    image_path: Path | None = None,
) -> None:
    """
    Run performance tests against the prediction endpoint.
    
    Args:
        url: Base URL of the FastAPI server
        num_requests: Total number of requests to make
        concurrent: Number of concurrent requests
        image_path: Path to test image (creates one if None)
    """
    # Prepare test image
    if image_path is None:
        image_path = Path("test_image.jpg")
        if not image_path.exists():
            create_test_image(image_path)
    
    if not image_path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    print(f"Performance Test Configuration:")
    print(f"  URL: {url}/predict")
    print(f"  Total requests: {num_requests}")
    print(f"  Concurrent requests: {concurrent}")
    print(f"  Test image: {image_path}")
    print(f"\nStarting performance test...\n")
    
    latencies: list[float] = []
    errors: list[tuple[int, Exception]] = []
    start_time = time.time()
    
    # Run requests
    with ThreadPoolExecutor(max_workers=concurrent) as executor:
        futures = [
            executor.submit(make_prediction_request, url, image_path, i)
            for i in range(num_requests)
        ]
        
        completed = 0
        for future in as_completed(futures):
            request_id, latency, response, error = future.result()
            completed += 1
            
            if error:
                errors.append((request_id, error))
                print(f"❌ Request {request_id} failed: {error}")
            else:
                latencies.append(latency)
                print(f"✓ Request {request_id}: {latency:.3f}s", end="\r")
    
    total_time = time.time() - start_time
    
    # Print results
    print("\n" + "=" * 60)
    print("PERFORMANCE TEST RESULTS")
    print("=" * 60)
    
    if latencies:
        print(f"\n✅ Successful requests: {len(latencies)}/{num_requests}")
        print(f"❌ Failed requests: {len(errors)}/{num_requests}")
        print(f"\n⏱️  Timing Statistics:")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Average latency: {statistics.mean(latencies):.3f}s")
        print(f"  Median latency: {statistics.median(latencies):.3f}s")
        print(f"  Min latency: {min(latencies):.3f}s")
        print(f"  Max latency: {max(latencies):.3f}s")
        if len(latencies) > 1:
            print(f"  Std deviation: {statistics.stdev(latencies):.3f}s")
        
        print(f"\n📊 Throughput:")
        print(f"  Requests per second: {len(latencies) / total_time:.2f}")
        print(f"  Average requests/second: {statistics.mean([1/l for l in latencies]):.2f}")
        
        # Percentiles
        sorted_latencies = sorted(latencies)
        p50 = sorted_latencies[int(len(sorted_latencies) * 0.50)]
        p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
        p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]
        print(f"\n📈 Percentiles:")
        print(f"  P50 (median): {p50:.3f}s")
        print(f"  P95: {p95:.3f}s")
        print(f"  P99: {p99:.3f}s")
    
    if errors:
        print(f"\n⚠️  Errors encountered:")
        for req_id, error in errors[:5]:  # Show first 5 errors
            print(f"  Request {req_id}: {type(error).__name__}: {error}")
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more errors")


def main() -> None:
    """Main entry point for the performance test script."""
    parser = argparse.ArgumentParser(description="Performance test for ML prediction API")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the FastAPI server (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=10,
        help="Total number of requests to make (default: 10)",
    )
    parser.add_argument(
        "--concurrent",
        type=int,
        default=1,
        help="Number of concurrent requests (default: 1)",
    )
    parser.add_argument(
        "--image",
        type=Path,
        default=None,
        help="Path to test image file (default: creates test_image.jpg)",
    )
    
    args = parser.parse_args()
    
    try:
        run_performance_test(
            url=args.url,
            num_requests=args.requests,
            concurrent=args.concurrent,
            image_path=args.image,
        )
    
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(0)
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()


