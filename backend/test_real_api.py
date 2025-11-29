import requests
import json

# Configuration
API_URL = "http://127.0.0.1:8000/api/disaster-news/analyze"

# IMPORTANT: Check your database for the correct ID for 'Tamil Nadu'.
# If you ran the seed script, it might be different. 
# You can check by visiting http://127.0.0.1:8000/api/disaster-news/states (if auth is off)
PAYLOAD = {
    "state_id": 33,  
    "city": "Chennai",
    "keyword": "rain"
}

def test_real_endpoint():
    print(f"🚀  Sending Request to: {API_URL}")
    print(f"📦  Payload: {json.dumps(PAYLOAD, indent=2)}")
    
    try:
        # Note: This assumes you have temporarily commented out 'RoleChecker' 
        # in the router file to bypass authentication for this test.
        response = requests.post(API_URL, json=PAYLOAD)
        
        print(f"\n📡  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅  SUCCESS! The Server returned:")
            print(f"   Total Articles: {data['total_articles']}")
            print(f"   Real Disaster News: {data['real_count']}")
            print(f"   Fake/Irrelevant: {data['fake_count']}")
            print(f"   Message: {data['message']}")
            
            if data['articles']:
                print("\n📰  Sample Article from Server:")
                first = data['articles'][0]
                print(f"   Source: {first['source']}")
                print(f"   Title:  {first['title']}")
                print(f"   Result: {first['prediction']}")
        else:
            print(f"❌  Error: {response.text}")

    except Exception as e:
        print(f"❌  Connection Failed: {e}")
        print("    (Is the uvicorn server running?)")

if __name__ == "__main__":
    test_real_endpoint()  # <--- Fixed line: Calling the function, not the filename