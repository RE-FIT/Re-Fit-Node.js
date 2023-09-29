class ReqSaveRoomDto {
  constructor(userId, otherId, postId, postType) {
    this.userId = userId;
    this.otherId = otherId;
    this.postId = postId;
    this.postType = postType;
  }
}

export default ReqSaveRoomDto;
