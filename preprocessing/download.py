import urllib.request
import json
import os
import dateutil.parser
from pytz import timezone

live_url = "https://raw.githubusercontent.com/nytimes/covid-19-data/master/live/us-counties.csv"
historical_url = (
    "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv"
)
last_updated_url = "https://api.github.com/repos/nytimes/covid-19-data/commits?path=live&page=1&per_page=1"


def get_last_updated():
    with urllib.request.urlopen(last_updated_url) as f:
        contents = json.loads(f.read())
    return (
        dateutil.parser.parse(contents[0]["commit"]["committer"]["date"])
        .astimezone(timezone("US/Eastern"))
        .strftime("%b %d, %Y at %I:%M %p %Z")
        .replace(" 0", " ")
    )


def download(working_dir=""):
    with open(os.path.join(working_dir, "live.csv"), "wb") as f:
        f.write(urllib.request.urlopen(live_url).read())

    with open(os.path.join(working_dir, "historical.csv"), "wb") as f:
        f.write(urllib.request.urlopen(historical_url).read())

    with open(os.path.join(working_dir, "last_updated.txt"), "w") as f:
        f.write(get_last_updated().strip())


if __name__ == "__main__":
    download()
