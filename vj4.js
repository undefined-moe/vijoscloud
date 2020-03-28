const axios = require('axios');
const { JSDOM } = require('jsdom');
const RE_CSRF = /\{"csrf_token":"(.*?)"/i;
const FormData = require('form-data');
const fs = require('fs');
String.prototype.query = function (query) {
    let t = new JSDOM(this);
    return t.window.document.querySelectorAll(query);
}
module.exports = class VJ4 {
    constructor(url) {
        this.url = url;
    }
    async loginWithToken(cookie) {
        this.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.url,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'cookie': this.cookie
            },
            transformRequest: [
                function (data) {
                    let ret = '';
                    for (let it in data)
                        ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&';
                    return ret;
                }
            ]
        });
        this.axiosUpload = axios.create({
            baseURL: this.url,
            headers: {
                'accept': 'application/json',
                'cookie': this.cookie
            }
        });
    }
    async getCsrf(url) {
        let res = await this.axios.get(url);
        return RE_CSRF.exec(res.data)[1];
    }
    async login(username, password) {
        await this.loginWithToken('');
        let res = await this.axios.post('login', { uname: username, password });
        await this.loginWithToken(res.headers['set-cookie'][0].split(';')[0]);
    }
    async getDomains() {
        let domains = [];
        let res = await this.axios.get('/home/domain');
        let nodes = res.data.query('tbody tr');
        for (let domain of nodes) {
            let name = domain.children[1].innerHTML.trim();
            let id = domain.children[3].children[0].href;
            if (id == '/') continue;
            else id = id.split('/')[2];
            console.log(name);
            let res = await this.axios.get(`/d/${id}/`);
            let info = (res.data.query('.section__body.typo p')[0] || {
                innerHTML: ''
            }).innerHTML.trim();
            let detail = {};
            try {
                detail = JSON.parse(info) || {};
            } catch (e) {
                // Ignore
            }
            domains.push({ name, id, info, detail });
        }
        return domains;
    }
    async upload(file, domain) {
        console.log(`Uploading ${file} to ${domain.name}`)
        let title = Math.random().toString();
        let numeric_pid = 'on';
        let content = 'a';
        let csrf_token = await this.getCsrf(`/d/${domain.id}/p/create`);
        let pid;
        try {
            await this.axios.post(`/d/${domain.id}/p/create`, {
                title, numeric_pid, content, csrf_token
            }, {
                headers: {
                    'accept': 'text/html'
                },
                maxRedirects: 0
            });
        } catch (res) {
            res.response = res.response || {};
            if (res.response.status == 302)
                pid = res.response.headers.location.split('/')[4];
            else throw res;
        }
        let form = new FormData();
        form.append('csrf_token', await this.getCsrf(`/d/${domain.id}/p/${pid}/upload`));
        form.append('file', fs.createReadStream(file));
        let res = await this.axiosUpload.post(`/d/${domain.id}/p/${pid}/upload`, form, {
            headers: form.getHeaders()
        });
        if (!res.data.error) return pid;
        else throw new Error(res.data.error);
    }
    async download(domain_id, pid, savepath) {
        let res = await this.axios.get(`/d/${domain_id}/p/${pid}/data`, { responseType: 'stream' });
        let w = await fs.createWriteStream(savepath);
        res.data.pipe(w);
        await new Promise((resolve, reject) => {
            w.on('finish', resolve);
            w.on('error', reject);
        });
    }
};
