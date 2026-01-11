class cacheManager{
    mapList=[];
    baseTime=0;
    constructor(redis, timeSlice, timeInterval){
        this.redis= redis;
        this.timeInterval= timeInterval;
        this.timeSlice= timeSlice;
        let padding=this.timeInterval%this.timeSlice + this.timeInterval
        this.cacheCount=Math.ceil(Math.log2(padding));
        this.mapList=[...Array(cacheCount).keys()].map(()=>{return new Map();});
    }
    async update(){
        this.baseTime+= this.timeSlice; // => now
        let Votes=await Promise.all([...Array(cacheCount).keys()].map(async (index)=>{
            let targetTime= this.baseTime- this.timeSlice*Math.pow(2,index); // end of a  this.timeSlice
            return await  this.redis.zrangebyscore('votes:recent',targetTime - this.timeSlice, targetTime);
        }));
        this.mapList.forEach((item,index)=>{
            for (const member of Votes[index]) {
                const bvid = member.split(':')[0];  // 从 `${bvid}:${userId}` 提取
                item.set(bvid,(item.get(bvid) || 0) - 1);
                if(index+1<this.mapList.length){
                    this.mapList[index+1].set(bvid,(this.mapList[index+1].get(bvid) || 0) + 1);
                }
            }
        });
        let headVote=await  this.redis.zrangebyscore('votes:recent', this.baseTime- this.timeSlice,  this.baseTime);
        for (const member of headVote) {
                const bvid = member.split(':')[0];
                this.mapList[0].set(bvid,(this.mapList[0].get(bvid) || 0) + 1);
            }
        setTimeout(()=>{this.update()}, this.baseTime+ this.timeSlice-Date.now());
    }
    async init(){
        this.baseTime=Date.now()
        let Votes=await Promise.all([...Array(cacheCount).keys()].map(async (index)=>{
            let targetTime= this.baseTime- this.timeSlice*Math.pow(2,index); // end of a  this.timeSlice
            return await  this.redis.zrangebyscore('votes:recent',targetTime,  this.baseTime);
        }));
        this.mapList.forEach((item,index)=>{
            for (const member of Votes[index]) {
                const bvid = member.split(':')[0];
                item.set(bvid,(item.get(bvid) || 0) + 1);
            }
        });
        setTimeout(()=>{this.update()}, this.baseTime+ this.timeSlice-Date.now());
    }
}
export default CacheManager;
