import Entity from "entitystorage";

export default class Setup extends Entity{
  initNew(){
    this.tag("forumsetup")
  }

  static lookup(){
    return Setup.find("tag:forumsetup") || new Setup()
  }

  ensureDefaults(){
    if(isNaN(this.maxFileSizeMB)) this.maxFileSizeMB = 50;
  }

  toObj(){
    return {
      maxFileSizeMB: this.maxFileSizeMB
    }
  }
}