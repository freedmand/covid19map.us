import urllib.request

all_data_url = "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/allData.json"
states_url = "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/states.json"
counties_url = "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/map.json"

with open("all_data.json", "wb") as f:
    f.write(urllib.request.urlopen(all_data_url).read())

with open("geo/states.topo.json", "wb") as f:
    f.write(urllib.request.urlopen(states_url).read())

with open("geo/counties.topo.json", "wb") as f:
    f.write(urllib.request.urlopen(counties_url).read())
