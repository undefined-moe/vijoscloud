const VJ4 = require('./vj4');
const path = require('path');
const { prompt, Select } = require('enquirer');
async function run() {
    let daemon = new VJ4('https://vijos.org/');
    let r = await prompt([
        {
            type: 'input',
            name: 'username',
            message: 'username?'
        },
        {
            type: 'password',
            name: 'password',
            message: 'password?'
        }
    ]);
    await daemon.login(r.username, r.password);
    let domains = await daemon.getDomains();
    let choices = [];
    for (let i of domains) choices.push(i.name);
    let d = await new Select({
        name: 'storage',
        message: 'Select a storage',
        choices
    }).run();
    for (let i of domains) if (i.name == d) d = i;
    r = await new Select({
        name: 'action',
        message: 'Select an action',
        choices: ['upload', 'download']
    }).run();
    console.log(r);
    if (r == 'upload') {
        r = await prompt([
            {
                type: 'input',
                name: 'file',
                message: 'path to file'
            }
        ]);
        let res = await daemon.upload(r.file, d);
        console.log(`https://vijos.org/d/${d.id}/p/${res}/data`);
    } else {
        r = await prompt([
            {
                type: 'input',
                name: 'fileId',
                message: 'fileId to download'
            }
        ]);
        await daemon.download(d.id, r.fileId, path.resolve(process.cwd(), `${d.id}_${r.fileId}.zip`));
        console.log(`${d.id}_${r.fileId}.zip`);
    }
}
run();