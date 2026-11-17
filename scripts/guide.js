import { exampleLines, makeChart, model } from './balance-chart.js';
import './pointing.js';

// Step 3: a still band, every line of the example in but the salary
const lines = exampleLines().map(line => ({ ...line, on: line.id !== 'salaire' }));
makeChart(document.getElementById('guide-chart'), { interactive: false }).show(model(lines).points, false);
