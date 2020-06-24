'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */

const http = require('https');
const settings = require('../settings');

class EtherScanIO {

    static sourceCodeForAddress(address) {
        return EtherScanIO.etherscanRequest("module=contract&action=getsourcecode&address=" + address);
    }

    static byteCodeForAddress(address) {
        return EtherScanIO.etherscanRequest("module=proxy&action=eth_getCode&tag=latest&address=" + address);
    }

    static etherscanRequest(cmd) {
        return new Promise((resolve, reject) => {
            http.get(`https://api.etherscan.io/api?apikey=${settings.extensionConfig().utils.etherscan.apikey}&${cmd}`, (res) => {
                const { statusCode } = res;
                const contentType = res.headers['content-type'];
    
                let error;
                if (statusCode !== 200) {
                    error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    console.error(error.message);
                    // Consume response data to free up memory
                    res.resume();
                    return;
                }
    
                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        if(parsedData.result){
                            resolve(parsedData.result);
                        } else {
                            reject(parsedData);
                        }
                    } catch (e) {
                        console.error(e.message);
                        reject(e);
                    }
                });
            }).on('error', (e) => {
                console.error(`Got error: ${e.message}`);
                reject(e);
            });
        });
    }
}





module.exports = {
    EtherScanIO: EtherScanIO
};