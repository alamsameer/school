const express = require('express');
const app = express();

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const spreadsheetId = '1dqX9M6OhjkeZ1hiRbkZY9l6x2IN0hq5csIb3Ld7yh_8'

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
// console.log(TOKEN_PATH,CREDENTIALS_PATH);

// data 
const dummyData = [
    ['sameer', '19-03080', '19BME001', 'Westline'],
    ['John Doe', '19-12345', '19XYZ001', 'Eastside'],
    ['Jane Smith', '19-98765', '19ABC001', 'Northridge'],
    ['Alice Johnson', '19-45678', '19DEF001', 'Southtown'],
    ['Bob Anderson', '19-56789', '19GHI001', 'Central'],
    ['Emily Williams', '19-24680', '19JKL001', 'Downtown'],
    ['Michael Brown', '19-13579', '19MNO001', 'Uptown'],
    ['Sarah Davis', '19-87654', '19PQR001', 'Suburbia'],
    ['David Wilson', '19-54321', '19STU001', 'Riverside'],
    ['Olivia', '19-97531', '19VWX001', 'Parkside'],
];



/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'Sheet1',
    });
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return;
    }
    else {
        return rows;
    }
}
// listMajors()

// write data to sheet

async function writeData(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const resource = {
        values: dummyData,
    };
    const response = await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: 'Sheet1!A2:E',
        valueInputOption: 'USER_ENTERED',
        resource,
    });
    console.log(`${response.data.updatedCells} cells updated.`);
}

async function appendData(auth,data) {
    const sheets = google.sheets({ version: 'v4', auth });

    const request = {
        spreadsheetId,
        range: "Sheet1",
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: data,
        },
    };

    try {
        const response = await sheets.spreadsheets.values.append(request);
        console.log(`${response.data.updates.updatedCells} cells appended.`);
    } catch (err) {
        console.error('The API returned an error:', err);
    }
}

//  list all the student 

app.get('/', async (req, res) => {
    const auth = await authorize();
    const rows = await listMajors(auth);
    res.send(rows);
});
app.post('/data',async (req, res) => {
    const { name, email } = req.query;
    const auth = await authorize();
    const data = [[name, email]];
    console.log(data
        );

    try {
        await appendData(auth, data);
        res.status(200).send('Data appended successfully.');
    } catch (err) {
        console.error('Error appending data:', err);
        res.status(500).send('Error appending data.');
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});