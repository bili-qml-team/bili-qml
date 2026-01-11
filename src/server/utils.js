class fakeMap{
    get(){return true}
    set(){}
    has(){return true}
    constructor(){}
}
class cacheManager{
    mapList=[]; //external access
    coldVoteDeleteThreshold=[]; //external access
    baseTime=0;
    lastUpdate=0;
    timeSlice=0;
    constructor(redis, timeBucketIndex){
        this.redis= redis;
        this.timeBucketIndex= [0, ...timeBucketIndex];
        this.cacheCount=this.timeBucketIndex.length;
        this.mapList=[...Array(this.cacheCount-1).keys()].map((index)=>{this.coldVoteDeleteThreshold[index]=0;return new Map();});
        this.fakemap=new fakeMap;
    }
    async fetchRange(index,slice = this.timeSlice){
        return await this.redis.zrangebyscore('votes:recent', this.baseTime - this.timeBucketIndex[index] - slice,this.baseTime - this.timeBucketIndex[index]);
        // now(head) -> lastupdate
    }
    async update(){
        this.baseTime=Date.now();
        this.timeSlice = this.baseTime-this.lastUpdate;
        this.lastUpdate = this.baseTime;
        let Votes=await Promise.all([...Array(this.cacheCount).keys()].map(async (index)=>{return this.fetchRange(index)}));
        this.mapList.forEach((item,index)=>{
            for (const member of Votes[index]) {
                const bvid = member.split(':')[0];
                item.set(bvid,(item.get(bvid) || 0) + 1);
            }
            for (const member of Votes[index+1]) {
                const bvid = member.split(':')[0];
                item.set(bvid,(item.get(bvid) || 0) - 1);
            }
        });
    }
    async init(){
        this.baseTime=Date.now()
        this.lastUpdate = this.baseTime;
        await this.updateBucketFromRedis([...Array(this.cacheCount-1).keys()]);
    }
    async updateBucketFromRedis(index){
        index=Array.isArray(index) ? index : [index];
        let Votes=await Promise.all(index.map(async (index)=>{return this.fetchRange(index,this.timeBucketIndex[index+1]-this.timeBucketIndex[index])}));
        index.forEach((index)=>{
            this.mapList[index].clear();
            for (const member of Votes[index]) {
                const bvid = member.split(':')[0];
                this.mapList[index].set(bvid,(this.mapList[index].get(bvid) || 0) + 1);
            }
        });
    }
    expireVotes(index){
        this.mapList[index].forEach((value,key)=>{
            if(!value || (value<this.coldVoteDeleteThreshold[index] && !(this.mapList[index-1] || this.fakemap).get(key))){
                this.mapList[index].delete(key);
            }
        });
    }
}
module.exports=cacheManager;
