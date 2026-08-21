export interface UserDTO {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ProfileDTO {
  id: string;
  userId: string;
  name: string;
  birthdate: string;
  gender: string;
  bio: string;
  latitude: number;
  longitude: number;
  ageInterestedInMin: number;
  ageInterestedInMax: number;
  distanceInterestedIn: number;
  gendersInterestedIn: string[];
  photos: PhotoDTO[];
  createdAt: string;
}

export interface PhotoDTO {
  id: string;
  profileId: string;
  url: string;
  isPrimary: boolean;
}

export interface MatchDTO {
  id: string;
  user1Id: string;
  user2Id: string;
  otherProfile?: ProfileDTO;
  lastMessage?: MessageDTO;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  TYPING = 'typing',
  ONLINE_STATUS = 'online_status',
  NEW_MATCH = 'new_match',
}
