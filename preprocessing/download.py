import urllib.request

cases_url = "https://usafactsstatic.blob.core.windows.net/public/data/covid-19/covid_confirmed_usafacts.csv"
deaths_url = "https://usafactsstatic.blob.core.windows.net/public/data/covid-19/covid_deaths_usafacts.csv"

with open("covid_confirmed_usafacts.csv", "wb") as f:
    f.write(urllib.request.urlopen(cases_url).read())

with open("covid_deaths_usafacts.csv", "wb") as f:
    f.write(urllib.request.urlopen(deaths_url).read())
