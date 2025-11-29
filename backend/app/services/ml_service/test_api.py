"""
Test script for the ML prediction API endpoint.

Usage:
    python test_api.py [--url URL] [--image PATH]
    
Examples:
    # Test with default settings
    python test_api.py
    
    # Test with custom image
    python test_api.py --image path/to/image.jpg
    
    # Test against different server
    python test_api.py --url http://localhost:8000
"""

import argparse
import sys
from pathlib import Path
from typing import Any

import requests
from PIL import Image


def create_test_image(output_path: Path, size: tuple[int, int] = (224, 224)) -> None:
    """Create a simple test image if none is provided."""
    img = Image.new("RGB", size, color=(128, 128, 128))
    img.save(output_path)
    print(f"Created test image at: {output_path}")


def test_prediction_endpoint(
    url: str = "http://localhost:8000", image_path: Path | None = None
) -> dict[str, Any]:
    """
    Test the /predict endpoint with an image file.
    
    Args:
        url: Base URL of the FastAPI server
        image_path: Path to the image file. If None, creates a test image.
    
    Returns:
        Response JSON from the API
    """
    endpoint = f"{url}/predict"
    
    # Create test image if none provided
    if image_path is None:
        image_path = Path("test_image.jpg")
        if not image_path.exists():
            create_test_image(image_path)
    
    if not image_path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    print(f"Testing endpoint: {endpoint}")
    print(f"Using image: {image_path}")
    
    try:
        with open(image_path, "rb") as f:
            files = {"file": (image_path.name, f, "image/jpeg")}
            response = requests.post(endpoint, files=files, timeout=30)
        
        response.raise_for_status()
        result = response.json()
        
        print("\n✅ Success!")
        print(f"Response status: {response.status_code}")
        print(f"Filename: {result.get('filename')}")
        
        prediction = result.get("prediction", [])
        if isinstance(prediction, list) and len(prediction) > 0:
            print(f"Prediction shape: {len(prediction)}")
            if isinstance(prediction[0], list):
                print(f"Prediction dimensions: {len(prediction)} x {len(prediction[0])}")
            print(f"First few values: {prediction[0][:5] if isinstance(prediction[0], list) else prediction[:5]}")
        
        return result
    
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Error: Could not connect to {url}")
        print("Make sure the FastAPI server is running:")
        print("  cd ml_service")
        print("  uvicorn app.main:app --reload")
        sys.exit(1)
    
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP Error: {e}")
        if e.response is not None:
            print(f"Response: {e.response.text}")
        sys.exit(1)
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


def main() -> None:
    """Main entry point for the test script."""
    parser = argparse.ArgumentParser(description="Test the ML prediction API")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the FastAPI server (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--image",
        type=Path,
        default=None,
        help="Path to test image file (default: creates test_image.jpg)",
    )
    
    args = parser.parse_args()
    
    try:
        result = test_prediction_endpoint(url=args.url, image_path=args.image)
        print("\n" + "=" * 50)
        print("Full response:")
        import json
        print(json.dumps(result, indent=2))
    
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(0)


if __name__ == "__main__":
    main()


