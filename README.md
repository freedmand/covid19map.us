# Covid19Map.us

![](public/media/demo.gif)

A zoomable, historical map of COVID-19 cases in the United States by county. This project is written in [Svelte](https://svelte.dev/)/JavaScript and makes extensive use of the mapping/visualization library [deck.gl](https://deck.gl).

The dataset is provided by [USAFacts](https://usafacts.org/visualizations/coronavirus-covid-19-spread-map/).

## Installation

This is a standard npm project. To install and run locally, make sure you have [Node](https://nodejs.org/) installed.

Clone from git:

```bash
git clone https://github.com/freedmand/covid19map
```

Enter the directory created and install with:

```bash
npm install
```

## Running

Run the project with:

```bash
npm run dev
```

This will launch a server at http://localhost:3000 that you can visit to see the application running.

## Building for production

Run the following command:

```bash
npm run build
```

The `public` folder will contain the static website that can then be deployed.

## Data processing

To update the dataset, enter the `preprocessing` directory:

```bash
cd preprocessing
```

Visit the [USAFacts dataset page](https://usafacts.org/visualizations/coronavirus-covid-19-spread-map/) and download the provided CSVs into the `preprocessing` folder. Also create/overwrite the file `last_updated.txt` within this same folder with a string containing the updated time that USAFacts provides, e.g. `March 25, 2020, at 12:00 AM Pacific/3:00 AM Eastern Time`.

Finally, run the processing script with:

```bash
python process.py
```

This will create a binary file called `output.bin` in the `public` directory that contains the map and data. When you refresh the web application it will pull this new data file.
