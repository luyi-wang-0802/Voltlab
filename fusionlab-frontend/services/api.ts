// 后端API服务
// 配置后端地址
const API_BASE = 'http://10.181.189.220:8000/api';

// Session响应接口
export interface SessionData {
  id: string;
  name: string;
  created_at: string;
}

// 房间相关接口
export interface RoomSearchRequest {
  attendee_count: number;  // 改为后端期望的字段名
  start_time_utc: string;  // 改为必填
  end_time_utc: string;    // 改为必填
  event_type?: string;
  required_equipment?: string[];
}

export interface RoomSummaryOut {
  id: number;
  ifcroom_id?: string;
  room_name?: string;  // 从 longname 改为 room_name
  floor?: string;      // 改为 string 类型
  area?: number;       // 新增房间面积
  spacebooking_max_occupancy?: number;
  spacebooking_existing_equipment?: string;
  spacebooking_is_bookable?: boolean;  // 新增是否可预订字段
}

export interface RoomMatchOut {
  room: RoomSummaryOut;
  match_score: number;
}

export interface RoomBookingCreate {
  ifcroom_id: string;
  type?: string;
  activity_title?: string;
  lead_organizer?: string;
  attendee_count: number;
  slogan?: string;
  start_time_utc: string;
  end_time_utc: string;
  poster_url?: string;
}

export interface RoomBookingOut {
  id: number;
  room_id: number;
  session_id: string;
  type?: string;
  activity_title?: string;
  lead_organizer?: string;
  attendee_count: number;
  slogan?: string;
  start_time_utc: string;
  end_time_utc: string;
  poster_url?: string;
  created_at: string;
}

// 海报上传响应接口
export interface PosterUploadResponse {
  poster_url: string;
  filename: string;
}

// 座位相关接口
export interface SeatSummaryOut {
  id: number;  // 数据库主键（内部使用）
  seat_id?: string;  // 例如："S-001"（前端显示用）
  floor?: string;  // 例如："3"
  is_in_ifc_space?: string;  // 例如："R-02"（房间名称）
  power_outlet_available?: boolean;
}

export interface SeatSearchRequest {
  start_time_utc: string;
  end_time_utc: string;
  floor?: string;  // 筛选楼层，如 "3"
  need_power?: boolean;  // 是否需要电源
}

export interface SeatMatchOut {
  seat: SeatSummaryOut;
  match_score: number;
}

export interface SeatBookingCreate {
  seat_id: number;  // 使用数据库主键 ID（不是 seat_id 字符串）
  start_time_utc: string;
  end_time_utc: string;
}

export interface SeatBookingOut {
  id: number;
  seat_id: number;  // 外键，指向 seats.id
  session_id: number;
  start_time_utc: string;
  end_time_utc: string;
  created_at: string;
}

/**
 * 登录函数 - 创建新的session
 * @param name 用户名
 * @returns Session数据 (包含id, name, created_at)
 */
export async function login(name: string): Promise<SessionData> {
  const response = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    throw new Error('登录失败');
  }
  
  const data = await response.json();
  return data;
}

/**
 * 验证session是否有效
 * @param sessionId Session ID
 * @returns Session数据
 */
export async function verifySession(sessionId: string): Promise<SessionData> {
  const response = await fetch(`${API_BASE}/me`, {
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    throw new Error('Session无效');
  }
  
  return response.json();
}

/**
 * 获取指定的session信息
 * @param sessionId Session ID
 * @param currentSessionId 当前用户的session ID（用于认证）
 * @returns Session数据
 */
export async function getSession(sessionId: string, currentSessionId: string): Promise<SessionData> {
  const response = await fetch(`${API_BASE}/session/${sessionId}`, {
    headers: {
      'X-Session-id': currentSessionId,
    },
  });
  
  if (!response.ok) {
    throw new Error('获取Session失败');
  }
  
  return response.json();
}
/**
 * 搜索座位
 * @param searchParams 搜索参数
 * @param sessionId 用户session ID
 * @returns 座位匹配结果列表
 */
export async function searchSeats(searchParams: SeatSearchRequest, sessionId: string): Promise<SeatMatchOut[]> {
  const response = await fetch(`${API_BASE}/seats/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-id': sessionId,
    },
    body: JSON.stringify(searchParams),
  });
  
  if (!response.ok) {
    // 获取详细错误信息
    const errorData = await response.json().catch(() => ({}));
    console.error('搜索座位API错误:', {
      status: response.status,
      statusText: response.statusText,
      errorData: errorData,
      sentParams: searchParams
    });
    const errorMessage = errorData.detail || errorData.message || `搜索座位失败 (${response.status})`;
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * 创建座位预订
 * @param bookingData 预订数据
 * @param sessionId 用户session ID
 * @returns 预订结果
 */
export async function createSeatBooking(bookingData: SeatBookingCreate, sessionId: string): Promise<SeatBookingOut> {
  const response = await fetch(`${API_BASE}/seat_bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-id': sessionId,
    },
    body: JSON.stringify(bookingData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '创建座位预订失败');
  }
  
  return response.json();
}

/**
 * 删除座位预订
 * @param bookingId 预订ID
 * @param sessionId 用户session ID
 * @returns 删除结果
 */
export async function deleteSeatBooking(bookingId: number, sessionId: string): Promise<{ok: boolean}> {
  const response = await fetch(`${API_BASE}/seat_bookings/${bookingId}`, {
    method: 'DELETE',
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '删除座位预订失败');
  }
  
  return response.json();
}

/**
 * 获取座位预订列表（当前用户）
 * @param sessionId 用户session ID
 * @returns 预订列表
 */
export async function getSeatBookings(sessionId: string): Promise<SeatBookingOut[]> {
  const response = await fetch(`${API_BASE}/seat_bookings`, {
    method: 'GET',
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '获取座位预订列表失败');
  }
  
  return response.json();
}

/**
 * 获取单个座位预订详情
 * @param bookingId 预订ID
 * @param sessionId 用户session ID
 * @returns 预订详情
 */
export async function getSeatBooking(bookingId: number, sessionId: string): Promise<SeatBookingOut> {
  const response = await fetch(`${API_BASE}/seat_bookings/${bookingId}`, {
    method: 'GET',
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '获取座位预订详情失败');
  }
  
  return response.json();
}

/**
 * 搜索房间
 * @param searchParams 搜索参数
 * @returns 房间匹配结果列表
 */
export async function searchRooms(searchParams: RoomSearchRequest, sessionId: string): Promise<RoomMatchOut[]> {
  const response = await fetch(`${API_BASE}/rooms/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-id': sessionId,
    },
    body: JSON.stringify(searchParams),
  });
  
  if (!response.ok) {
    // 获取详细错误信息
    const errorData = await response.json().catch(() => ({}));
    console.error('搜索房间API错误:', {
      status: response.status,
      statusText: response.statusText,
      errorData: errorData,
      sentParams: searchParams
    });
    const errorMessage = errorData.detail || errorData.message || `搜索房间失败 (${response.status})`;
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * 创建房间预订
 * @param bookingData 预订数据
 * @param sessionId 用户session ID
 * @returns 预订结果
 */
export async function createRoomBooking(bookingData: RoomBookingCreate, sessionId: string): Promise<RoomBookingOut> {
  const response = await fetch(`${API_BASE}/room_bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-id': sessionId,
    },
    body: JSON.stringify(bookingData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '创建预订失败');
  }
  
  return response.json();
}

/**
 * 删除房间预订
 * @param bookingId 预订ID
 * @param sessionId 用户session ID
 * @returns 删除结果
 */
export async function deleteRoomBooking(bookingId: number, sessionId: string): Promise<{ok: boolean}> {
  const response = await fetch(`${API_BASE}/room_bookings/${bookingId}`, {
    method: 'DELETE',
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '删除预订失败');
  }
  
  return response.json();
}

/**
 * 上传海报文件
 * @param file 海报图片文件
 * @returns 上传结果，包含文件URL
 */
export async function uploadPoster(file: File): Promise<PosterUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/upload/poster`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '上传海报失败');
  }
  
  return response.json();
}

/**
 * 获取房间预订列表（当前用户）
 * @param sessionId 用户session ID
 * @returns 预订列表
 */
export async function getRoomBookings(sessionId: string): Promise<RoomBookingOut[]> {
  const response = await fetch(`${API_BASE}/room_bookings`, {
    method: 'GET',
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '获取预订列表失败');
  }
  
  return response.json();
}

/**
 * 获取单个房间预订详情
 * @param bookingId 预订ID
 * @param sessionId 用户session ID
 * @returns 预订详情
 */
export async function getRoomBooking(bookingId: number, sessionId: string): Promise<RoomBookingOut> {
  const response = await fetch(`${API_BASE}/room_bookings/${bookingId}`, {
    method: 'GET',
    headers: {
      'X-Session-id': sessionId,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '获取预订详情失败');
  }
  
  return response.json();
}