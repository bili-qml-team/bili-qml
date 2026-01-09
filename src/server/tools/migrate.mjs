import fs from 'fs';

var paramenter={
    url:'',
    token:'',
    mode:'',
    filePath:'./Redis.json'
}
async function getDB() {
    try {
        const res = await fetch(`${paramenter.url}/get/votes`, {
            headers: { Authorization: `Bearer ${paramenter.token}` }
        });
        const data = await res.text();
        return data;
    } catch (e) {
        console.error('Redis 读取失败', e);
    }
}
function parse(userId,time,bvid) {
  const votedKey = `voted:${bvid}`;
  const videoKey = `video:${bvid}`;
  const member = `${bvid}:${userId}`;
  const timeStr = time.toString();

  const parts = [];

  // SADD voted:{bvid} userId
  parts.push(`*3\r\n$4\r\nSADD\r\n$${votedKey.length}\r\n${votedKey}\r\n$${userId.length}\r\n${userId}\r\n`);
  // ZADD votes:recent time member
  parts.push(`*3\r\n$4\r\nZADD\r\n$12\r\nvotes:recent\r\n$${timeStr.length}\r\n${timeStr}\r\n$${member.length}\r\n${member}\r\n`);

  return parts.join('');
}
function SetVotesTotal(bvid, targetVotes) {
  const videoKey = `video:${bvid}`;
  const targetStr = targetVotes.toString();
  return `*4\r\n$4\r\nHSET\r\n$${videoKey.length}\r\n${videoKey}\r\n$10\r\nvotesTotal\r\n$${targetStr.length}\r\n${targetStr}\r\n`;
}

function argvProcess(){
    const help="Migrate datebase to new version of server.js\nfor commit:4907b93a3d41042db8c0cb5e9fda180dbc1b81a6\n \n -u,--url [parament]\t Redis Endpoint URL\n -t,--token [parament]\t Redis Token\n -i,o \t\t\t File path(default is ./Redis.json)  \n -d,--download \t\t Download orignal Redis data\n -p,--parse\t\t Parse and restore as Redis archive\n";
    process.argv.forEach((entry,index)=>{
        if(/^-(?!-)/.test(entry)){
            entry=entry.replace(/^-(?!-)/,"")
            var token=entry.split("");
            token.forEach((subtoken)=>{
                switch(subtoken){
                case "u":
                    if(token.some((a)=>{return a.includes("t")})){
                        console.log('Wrong paramenter format')
                        process.exit(1);
                    }
                    paramenter.url=process.argv[index+1];
                    break;
                case "t":
                    if(token.some((a)=>{return a.includes("u")})){
                        console.log('Wrong paramenter format')
                        process.exit(1);
                    }
                    paramenter.token=process.argv[index+1];
                    break;
                case "d":
                    if(token.some((a)=>{return a.includes("p")})){
                        console.log('Confilct paramenter')
                        process.exit(1);
                    }
                    paramenter.mode="download";
                    break;
                case "p":
                    if(token.some((a)=>{return a.includes("d")})){
                        console.log('Confilct paramenter')
                        process.exit(1);
                    }
                    paramenter.mode="parse";
                    break;
                case "i":
                case "o":
                    paramenter.filePath=process.argv[index+1];
                    break;
                case "h":
                    console.log(help);
                    break;
                default:
                    console.log("Unknow paramenter: "+subtoken)
            }
            });
        }else{
            if(/^--/.test(entry)){
                entry=entry.replace(/^--/,"");
                switch(entry){
                case "url":
                    paramenter.url=process.argv[index+1];
                    break;
                case "token":
                    paramenter.token=process.argv[index+1];
                    break;
                case "download":
                    paramenter.mode="download";
                    break;
                case "parse":
                    paramenter.mode="parse";
                    break;
                case "help":
                    console.log(help);
                    break;
                default:
                    console.log("Unknow paramenter: "+entry)
            }
        }
    }});
    if(process.argv.length===2){
        console.log(help);
    }

}
async function main(){
    argvProcess();
    if(paramenter.mode=="download"){
        fs.writeFileSync(paramenter.filePath,await getDB(),"utf8");
    }else if(paramenter.mode=="parse"){
        var json_t=fs.readFileSync(paramenter.filePath,"utf8");
        var json=JSON.parse(json_t);
        try{
        let length=Object.keys(json).length;
        var index=1;
        for(const bvid in json){
            var commands=Object.keys(json[bvid].votes).map((user) => {
                return parse(user, json[bvid].votes[user], bvid);
            });
            let Votes=SetVotesTotal(bvid,commands.length);
            commands.push(Votes);
            fs.appendFileSync(`${paramenter.filePath}.resp`, commands.join(''));
            console.log("complete "+ bvid +" of "+index+"/"+length);
            index++;
        }

        }catch(err){
            console.log("oops,something went wrong.")
            console.log(err);
        }
    }
}
await main()
