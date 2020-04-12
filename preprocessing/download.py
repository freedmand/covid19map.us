import urllib.request
import os

all_data_url = "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/allData.json"
states_url = "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/states.json"
counties_url = "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/map.json"

def download(working_dir = ''):
    with open(os.path.join(working_dir, "all_data.json"), "wb") as f:
        f.write(urllib.request.urlopen(all_data_url).read())

    with open(os.path.join(working_dir, "geo/states.topo.json"), "wb") as f:
        f.write(urllib.request.urlopen(states_url).read())

    with open(os.path.join(working_dir, "geo/counties.topo.json"), "wb") as f:
        f.write(urllib.request.urlopen(counties_url).read())


if __name__ == '__main__':
    download()