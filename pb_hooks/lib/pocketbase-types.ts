/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Genre = "genre",
	ListUser = "list_user",
	Lists = "lists",
	Movies = "movies",
	MoviesGenres = "movies_genres",
	Users = "users",
	WatchedHistory = "watched_history",
}

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export type GenreRecord = {
	created: IsoAutoDateString
	genre_id?: string
	id: string
	name?: string
	updated: IsoAutoDateString
}

export type ListUserRecord = {
	created: IsoAutoDateString
	id: string
	invited_user?: RecordIdString
	updated: IsoAutoDateString
	user_permission?: string
}

export type ListsRecord = {
	created: IsoAutoDateString
	id: string
	list_title?: string
	owner?: RecordIdString
	updated: IsoAutoDateString
}

export type MoviesRecord = {
	adult?: boolean
	backdrop_path?: string
	created: IsoAutoDateString
	homepage?: string
	id: string
	imdb_id?: string
	original_language?: string
	original_title?: string
	overview?: string
	poster_path?: string
	release_date?: IsoDateString
	runtime?: number
	status?: string
	tagline?: string
	title?: string
	tmdb_id?: string
	updated: IsoAutoDateString
}

export type MoviesGenresRecord = {
	created: IsoAutoDateString
	genre?: RecordIdString
	id: string
	movie?: RecordIdString
	updated: IsoAutoDateString
}

export type UsersRecord = {
	avatar?: FileNameString
	created: IsoAutoDateString
	deleted?: boolean
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export type WatchedHistoryRecord = {
	created: IsoAutoDateString
	id: string
	movie?: RecordIdString
	rating?: number
	succeeded?: boolean
	updated: IsoAutoDateString
	user?: RecordIdString
	watched_at?: IsoDateString
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type GenreResponse<Texpand = unknown> = Required<GenreRecord> & BaseSystemFields<Texpand>
export type ListUserResponse<Texpand = unknown> = Required<ListUserRecord> & BaseSystemFields<Texpand>
export type ListsResponse<Texpand = unknown> = Required<ListsRecord> & BaseSystemFields<Texpand>
export type MoviesResponse<Texpand = unknown> = Required<MoviesRecord> & BaseSystemFields<Texpand>
export type MoviesGenresResponse<Texpand = unknown> = Required<MoviesGenresRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type WatchedHistoryResponse<Texpand = unknown> = Required<WatchedHistoryRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	genre: GenreRecord
	list_user: ListUserRecord
	lists: ListsRecord
	movies: MoviesRecord
	movies_genres: MoviesGenresRecord
	users: UsersRecord
	watched_history: WatchedHistoryRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	genre: GenreResponse
	list_user: ListUserResponse
	lists: ListsResponse
	movies: MoviesResponse
	movies_genres: MoviesGenresResponse
	users: UsersResponse
	watched_history: WatchedHistoryResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
