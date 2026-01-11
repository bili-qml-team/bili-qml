class cacheManager{
    mapList=[];
    baseTime=0;
    lastUpdate=0;
    timeSlice=0;
    constructor(redis, timeBucketIndex){
        this.redis= redis;
        this.timeBucketIndex= [0, ...timeBucketIndex];
        this.cacheCount=this.timeBucketIndex.length;
        this.mapList=[...Array(this.cacheCount-1).keys()].map(()=>{return new Map();});
    }
    async fetchRange(index,slice = this.timeSlice){
        return await this.redis.zrangebyscore('votes:recent', this.baseTime - this.timeBucketIndex[index] - slice,this.baseTime - this.timeBucketIndex[index]);
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
        let Votes=await Promise.all([...Array(this.cacheCount-1).keys()].map(async (index)=>{return this.fetchRange(index,this.timeBucketIndex[index+1]-this.timeBucketIndex[index])}));
        this.mapList.forEach((item,index)=>{
            for (const member of Votes[index]) {
                const bvid = member.split(':')[0];
                item.set(bvid,(item.get(bvid) || 0) + 1);
            }
        });
    }
}
