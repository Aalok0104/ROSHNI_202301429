import requests
import json

# URL
API_URL = "http://127.0.0.1:8000/api/disaster-news/analyze"

# Payload (Using ID 33 as you did)
PAYLOAD = {
    "state_id": 33,
    "city": "Chennai",
    "keyword": "rain"
}

def debug_api():
    print(f"🚀  Sending Request to: {API_URL}")
    print("⏳  Waiting for server response (this runs the real scraper)...")
    
    try:
        # Note: Bypassing auth only works if you commented out RoleChecker in the router
        # Otherwise this might return 401
        response = requests.post(API_URL, json=PAYLOAD)
        
        print("\n" + "="*50)
        print(f"📡  STATUS CODE: {response.status_code}")
        print("="*50)
        
        print("\n📄  RAW RESPONSE BODY:")
        try:
            # Try to pretty-print JSON
            data = response.json()
            print(json.dumps(data, indent=4))
        except:
            # If not JSON, print text
            print(response.text)
            
    except Exception as e:
        print(f"❌  Connection Error: {e}")

if __name__ == "__main__":
    debug_api()