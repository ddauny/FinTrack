--
-- PostgreSQL database dump
--

-- Dumped from database version 15.14
-- Dumped by pg_dump version 17.0

-- Started on 2025-11-04 01:53:17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 16405)
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "initialBalance" numeric(65,30) DEFAULT 0.00 NOT NULL
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16404)
-- Name: Account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Account_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Account_id_seq" OWNER TO postgres;

--
-- TOC entry 3543 (class 0 OID 0)
-- Dependencies: 217
-- Name: Account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Account_id_seq" OWNED BY public."Account".id;


--
-- TOC entry 232 (class 1259 OID 16523)
-- Name: AssetGroup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AssetGroup" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."AssetGroup" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16522)
-- Name: AssetGroup_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AssetGroup_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AssetGroup_id_seq" OWNER TO postgres;

--
-- TOC entry 3544 (class 0 OID 0)
-- Dependencies: 231
-- Name: AssetGroup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AssetGroup_id_seq" OWNED BY public."AssetGroup".id;


--
-- TOC entry 234 (class 1259 OID 16533)
-- Name: AssetItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AssetItem" (
    id integer NOT NULL,
    "groupId" integer,
    name text NOT NULL,
    description text,
    "parentItemId" integer,
    hidden boolean DEFAULT false NOT NULL,
    "depreciationAmount" numeric(65,30)
);


ALTER TABLE public."AssetItem" OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16532)
-- Name: AssetItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AssetItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AssetItem_id_seq" OWNER TO postgres;

--
-- TOC entry 3545 (class 0 OID 0)
-- Dependencies: 233
-- Name: AssetItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AssetItem_id_seq" OWNED BY public."AssetItem".id;


--
-- TOC entry 236 (class 1259 OID 16542)
-- Name: AssetValuation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AssetValuation" (
    id integer NOT NULL,
    "itemId" integer NOT NULL,
    month timestamp(3) without time zone NOT NULL,
    value numeric(65,30) NOT NULL
);


ALTER TABLE public."AssetValuation" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16541)
-- Name: AssetValuation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AssetValuation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AssetValuation_id_seq" OWNER TO postgres;

--
-- TOC entry 3546 (class 0 OID 0)
-- Dependencies: 235
-- Name: AssetValuation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AssetValuation_id_seq" OWNED BY public."AssetValuation".id;


--
-- TOC entry 224 (class 1259 OID 16434)
-- Name: Budget; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Budget" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    amount numeric(65,30) NOT NULL,
    period text NOT NULL
);


ALTER TABLE public."Budget" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16433)
-- Name: Budget_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Budget_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Budget_id_seq" OWNER TO postgres;

--
-- TOC entry 3547 (class 0 OID 0)
-- Dependencies: 223
-- Name: Budget_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Budget_id_seq" OWNED BY public."Budget".id;


--
-- TOC entry 220 (class 1259 OID 16415)
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16414)
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Category_id_seq" OWNER TO postgres;

--
-- TOC entry 3548 (class 0 OID 0)
-- Dependencies: 219
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- TOC entry 228 (class 1259 OID 16452)
-- Name: Holding; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Holding" (
    id integer NOT NULL,
    "portfolioId" integer NOT NULL,
    "tickerSymbol" text NOT NULL,
    quantity numeric(65,30) NOT NULL,
    "avgPurchasePrice" numeric(65,30) NOT NULL
);


ALTER TABLE public."Holding" OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16451)
-- Name: Holding_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Holding_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Holding_id_seq" OWNER TO postgres;

--
-- TOC entry 3549 (class 0 OID 0)
-- Dependencies: 227
-- Name: Holding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Holding_id_seq" OWNED BY public."Holding".id;


--
-- TOC entry 230 (class 1259 OID 16461)
-- Name: ManualAsset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ManualAsset" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "estimatedValue" numeric(65,30) NOT NULL,
    "associatedDebt" numeric(65,30) DEFAULT 0.00 NOT NULL
);


ALTER TABLE public."ManualAsset" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16460)
-- Name: ManualAsset_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ManualAsset_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ManualAsset_id_seq" OWNER TO postgres;

--
-- TOC entry 3550 (class 0 OID 0)
-- Dependencies: 229
-- Name: ManualAsset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ManualAsset_id_seq" OWNED BY public."ManualAsset".id;


--
-- TOC entry 226 (class 1259 OID 16443)
-- Name: Portfolio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Portfolio" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Portfolio" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16442)
-- Name: Portfolio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Portfolio_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Portfolio_id_seq" OWNER TO postgres;

--
-- TOC entry 3551 (class 0 OID 0)
-- Dependencies: 225
-- Name: Portfolio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Portfolio_id_seq" OWNED BY public."Portfolio".id;


--
-- TOC entry 222 (class 1259 OID 16424)
-- Name: Transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Transaction" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "accountId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(65,30) NOT NULL,
    type text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Transaction" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16423)
-- Name: Transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Transaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Transaction_id_seq" OWNER TO postgres;

--
-- TOC entry 3552 (class 0 OID 0)
-- Dependencies: 221
-- Name: Transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Transaction_id_seq" OWNED BY public."Transaction".id;


--
-- TOC entry 216 (class 1259 OID 16395)
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16394)
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- TOC entry 3553 (class 0 OID 0)
-- Dependencies: 215
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- TOC entry 214 (class 1259 OID 16385)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 3318 (class 2604 OID 16408)
-- Name: Account id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account" ALTER COLUMN id SET DEFAULT nextval('public."Account_id_seq"'::regclass);


--
-- TOC entry 3328 (class 2604 OID 16526)
-- Name: AssetGroup id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetGroup" ALTER COLUMN id SET DEFAULT nextval('public."AssetGroup_id_seq"'::regclass);


--
-- TOC entry 3329 (class 2604 OID 16536)
-- Name: AssetItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetItem" ALTER COLUMN id SET DEFAULT nextval('public."AssetItem_id_seq"'::regclass);


--
-- TOC entry 3331 (class 2604 OID 16545)
-- Name: AssetValuation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetValuation" ALTER COLUMN id SET DEFAULT nextval('public."AssetValuation_id_seq"'::regclass);


--
-- TOC entry 3323 (class 2604 OID 16437)
-- Name: Budget id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Budget" ALTER COLUMN id SET DEFAULT nextval('public."Budget_id_seq"'::regclass);


--
-- TOC entry 3320 (class 2604 OID 16418)
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- TOC entry 3325 (class 2604 OID 16455)
-- Name: Holding id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Holding" ALTER COLUMN id SET DEFAULT nextval('public."Holding_id_seq"'::regclass);


--
-- TOC entry 3326 (class 2604 OID 16464)
-- Name: ManualAsset id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualAsset" ALTER COLUMN id SET DEFAULT nextval('public."ManualAsset_id_seq"'::regclass);


--
-- TOC entry 3324 (class 2604 OID 16446)
-- Name: Portfolio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Portfolio" ALTER COLUMN id SET DEFAULT nextval('public."Portfolio_id_seq"'::regclass);


--
-- TOC entry 3321 (class 2604 OID 16427)
-- Name: Transaction id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction" ALTER COLUMN id SET DEFAULT nextval('public."Transaction_id_seq"'::regclass);


--
-- TOC entry 3316 (class 2604 OID 16398)
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- TOC entry 3519 (class 0 OID 16405)
-- Dependencies: 218
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Account" VALUES (1, 1, 'Primary', 'Checking', 0.000000000000000000000000000000);


--
-- TOC entry 3533 (class 0 OID 16523)
-- Dependencies: 232
-- Data for Name: AssetGroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."AssetGroup" VALUES (1, 1, 'CASH');
INSERT INTO public."AssetGroup" VALUES (2, 1, 'Investimenti');


--
-- TOC entry 3535 (class 0 OID 16533)
-- Dependencies: 234
-- Data for Name: AssetItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."AssetItem" VALUES (1, 1, 'Intesa', 'Conto personale Intesa', NULL, false, NULL);
INSERT INTO public."AssetItem" VALUES (2, 1, 'Revolut', 'Conto personale Revolut', NULL, false, NULL);
INSERT INTO public."AssetItem" VALUES (5, 2, 'Intesa', '', NULL, false, NULL);
INSERT INTO public."AssetItem" VALUES (8, 1, 'Contanti', NULL, NULL, false, NULL);
INSERT INTO public."AssetItem" VALUES (6, 2, 'BTPVAL 14MAG30 SU CUM', NULL, 5, true, NULL);
INSERT INTO public."AssetItem" VALUES (7, 2, 'INVESTO SMART 60', NULL, 5, true, NULL);
INSERT INTO public."AssetItem" VALUES (3, 1, 'Conto principale', NULL, 2, true, NULL);
INSERT INTO public."AssetItem" VALUES (4, 1, 'Conto deposito', NULL, 2, true, NULL);


--
-- TOC entry 3537 (class 0 OID 16542)
-- Dependencies: 236
-- Data for Name: AssetValuation; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."AssetValuation" VALUES (11, 1, '2025-10-01 00:00:00', 7957.530000000000000000000000000000);
INSERT INTO public."AssetValuation" VALUES (15, 3, '2025-10-01 00:00:00', 392.620000000000000000000000000000);
INSERT INTO public."AssetValuation" VALUES (17, 4, '2025-10-01 00:00:00', 1002.910000000000000000000000000000);
INSERT INTO public."AssetValuation" VALUES (19, 8, '2025-10-01 00:00:00', 950.000000000000000000000000000000);
INSERT INTO public."AssetValuation" VALUES (21, 6, '2025-10-01 00:00:00', 3114.000000000000000000000000000000);
INSERT INTO public."AssetValuation" VALUES (23, 7, '2025-10-01 00:00:00', 3047.250000000000000000000000000000);


--
-- TOC entry 3525 (class 0 OID 16434)
-- Dependencies: 224
-- Data for Name: Budget; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3521 (class 0 OID 16415)
-- Dependencies: 220
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Category" VALUES (1, 1, 'Ristoranti', 'Expense');
INSERT INTO public."Category" VALUES (2, 1, 'Shopping', 'Expense');
INSERT INTO public."Category" VALUES (3, 1, 'Ripetizioni', 'Income');
INSERT INTO public."Category" VALUES (4, 1, 'Abbonamenti', 'Expense');


--
-- TOC entry 3529 (class 0 OID 16452)
-- Dependencies: 228
-- Data for Name: Holding; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3531 (class 0 OID 16461)
-- Dependencies: 230
-- Data for Name: ManualAsset; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3527 (class 0 OID 16443)
-- Dependencies: 226
-- Data for Name: Portfolio; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3523 (class 0 OID 16424)
-- Dependencies: 222
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Transaction" VALUES (1, 1, 1, 1, '2025-11-02 00:00:00', 107.200000000000000000000000000000, 'Expense', 'Compleanno doppio malto', '2025-11-03 23:13:18.945');
INSERT INTO public."Transaction" VALUES (2, 1, 1, 1, '2025-11-02 00:00:00', 7.800000000000000000000000000000, 'Expense', 'MC', '2025-11-03 23:16:49.889');
INSERT INTO public."Transaction" VALUES (4, 1, 1, 2, '2025-11-03 00:00:00', 17.240000000000000000000000000000, 'Expense', 'Alimentatore amazon', '2025-11-03 23:19:08.482');
INSERT INTO public."Transaction" VALUES (5, 1, 1, 3, '2025-11-03 00:00:00', 80.000000000000000000000000000000, 'Income', 'Simone', '2025-11-03 23:22:41.935');
INSERT INTO public."Transaction" VALUES (6, 1, 1, 3, '2025-11-03 00:00:00', 172.500000000000000000000000000000, 'Income', 'Andrea AM', '2025-11-03 23:22:53.034');
INSERT INTO public."Transaction" VALUES (7, 1, 1, 3, '2025-11-03 00:00:00', 90.000000000000000000000000000000, 'Income', 'Andrea', '2025-11-03 23:23:04.655');
INSERT INTO public."Transaction" VALUES (8, 1, 1, 3, '2025-11-03 00:00:00', 50.000000000000000000000000000000, 'Income', 'Alessio', '2025-11-03 23:23:14.065');
INSERT INTO public."Transaction" VALUES (9, 1, 1, 2, '2025-11-03 00:00:00', 5.400000000000000000000000000000, 'Expense', 'Cerotti', '2025-11-03 23:24:14.59');
INSERT INTO public."Transaction" VALUES (10, 1, 1, 4, '2025-11-02 00:00:00', 0.990000000000000000000000000000, 'Expense', 'iCloud', '2025-11-03 23:25:03.385');


--
-- TOC entry 3517 (class 0 OID 16395)
-- Dependencies: 216
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."User" VALUES (1, 'marco.ricci2803@gmail.com', '$2a$10$U4MXB8jYfuSpNMrneEHTA.wHcBxHgR/21wgB2BRN9hLeXHFAkmh76', '2025-10-31 00:50:06.464');


--
-- TOC entry 3515 (class 0 OID 16385)
-- Dependencies: 214
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public._prisma_migrations VALUES ('93ab38a7-fadc-49f4-875d-6ab34fdbe4bd', '874aa1fd873171d0f8f816fa5d36ebfc2dea6232cceba7e94c67f95b77a363a5', '2025-10-31 00:49:50.987756+00', '20251016200950_init', NULL, NULL, '2025-10-31 00:49:50.878056+00', 1);
INSERT INTO public._prisma_migrations VALUES ('55cbe9da-7927-4909-820b-bdeca255fd2e', '5306ef48d10ab863ae80b51d601dbbd1caf2d389950ef7a11a6e921e361f5a80', '2025-10-31 00:49:51.031608+00', '20251016212541_asset_groups', NULL, NULL, '2025-10-31 00:49:50.989759+00', 1);
INSERT INTO public._prisma_migrations VALUES ('9395e722-a96f-4149-a299-d0483dc06ed5', '8ef8d5393479ff1d53d859a6f2d318c8fa4d4a99b278893bb297627917b35f5c', '2025-10-31 00:49:51.043435+00', '20251016215507_asset_item_nesting', NULL, NULL, '2025-10-31 00:49:51.034391+00', 1);
INSERT INTO public._prisma_migrations VALUES ('4c294d00-3508-4cdd-97a3-29216f3a7c0b', '3aa24b79e11be775046aedea844cb9e32c3e44d2ae999b157e5cf82cab5a876d', '2025-10-31 00:49:51.052423+00', '20251016233311_asset_item_hidden', NULL, NULL, '2025-10-31 00:49:51.046042+00', 1);
INSERT INTO public._prisma_migrations VALUES ('cac04b68-0949-4e3f-88a9-e97efbcf2845', '1d51087ed72b7889ab6b7816dbc6715f5402e700d47150b99d1f00619e53356b', '2025-10-31 00:49:51.063355+00', '20251017103332_add_depreciation_amount', NULL, NULL, '2025-10-31 00:49:51.055649+00', 1);


--
-- TOC entry 3554 (class 0 OID 0)
-- Dependencies: 217
-- Name: Account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Account_id_seq"', 1, true);


--
-- TOC entry 3555 (class 0 OID 0)
-- Dependencies: 231
-- Name: AssetGroup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AssetGroup_id_seq"', 2, true);


--
-- TOC entry 3556 (class 0 OID 0)
-- Dependencies: 233
-- Name: AssetItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AssetItem_id_seq"', 8, true);


--
-- TOC entry 3557 (class 0 OID 0)
-- Dependencies: 235
-- Name: AssetValuation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AssetValuation_id_seq"', 25, true);


--
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 223
-- Name: Budget_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Budget_id_seq"', 1, false);


--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 219
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Category_id_seq"', 4, true);


--
-- TOC entry 3560 (class 0 OID 0)
-- Dependencies: 227
-- Name: Holding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Holding_id_seq"', 1, false);


--
-- TOC entry 3561 (class 0 OID 0)
-- Dependencies: 229
-- Name: ManualAsset_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ManualAsset_id_seq"', 1, false);


--
-- TOC entry 3562 (class 0 OID 0)
-- Dependencies: 225
-- Name: Portfolio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Portfolio_id_seq"', 1, false);


--
-- TOC entry 3563 (class 0 OID 0)
-- Dependencies: 221
-- Name: Transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Transaction_id_seq"', 10, true);


--
-- TOC entry 3564 (class 0 OID 0)
-- Dependencies: 215
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 1, true);


--
-- TOC entry 3338 (class 2606 OID 16413)
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- TOC entry 3353 (class 2606 OID 16531)
-- Name: AssetGroup AssetGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetGroup"
    ADD CONSTRAINT "AssetGroup_pkey" PRIMARY KEY (id);


--
-- TOC entry 3355 (class 2606 OID 16540)
-- Name: AssetItem AssetItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetItem"
    ADD CONSTRAINT "AssetItem_pkey" PRIMARY KEY (id);


--
-- TOC entry 3358 (class 2606 OID 16547)
-- Name: AssetValuation AssetValuation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetValuation"
    ADD CONSTRAINT "AssetValuation_pkey" PRIMARY KEY (id);


--
-- TOC entry 3345 (class 2606 OID 16441)
-- Name: Budget Budget_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_pkey" PRIMARY KEY (id);


--
-- TOC entry 3340 (class 2606 OID 16422)
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- TOC entry 3349 (class 2606 OID 16459)
-- Name: Holding Holding_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Holding"
    ADD CONSTRAINT "Holding_pkey" PRIMARY KEY (id);


--
-- TOC entry 3351 (class 2606 OID 16469)
-- Name: ManualAsset ManualAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualAsset"
    ADD CONSTRAINT "ManualAsset_pkey" PRIMARY KEY (id);


--
-- TOC entry 3347 (class 2606 OID 16450)
-- Name: Portfolio Portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Portfolio"
    ADD CONSTRAINT "Portfolio_pkey" PRIMARY KEY (id);


--
-- TOC entry 3342 (class 2606 OID 16432)
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- TOC entry 3336 (class 2606 OID 16403)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 3333 (class 2606 OID 16393)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3356 (class 1259 OID 16548)
-- Name: AssetValuation_itemId_month_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AssetValuation_itemId_month_key" ON public."AssetValuation" USING btree ("itemId", month);


--
-- TOC entry 3343 (class 1259 OID 16471)
-- Name: Transaction_userId_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Transaction_userId_date_idx" ON public."Transaction" USING btree ("userId", date);


--
-- TOC entry 3334 (class 1259 OID 16470)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 3359 (class 2606 OID 16472)
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3369 (class 2606 OID 16549)
-- Name: AssetGroup AssetGroup_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetGroup"
    ADD CONSTRAINT "AssetGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3370 (class 2606 OID 16554)
-- Name: AssetItem AssetItem_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetItem"
    ADD CONSTRAINT "AssetItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."AssetGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3371 (class 2606 OID 16564)
-- Name: AssetItem AssetItem_parentItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetItem"
    ADD CONSTRAINT "AssetItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES public."AssetItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3372 (class 2606 OID 16559)
-- Name: AssetValuation AssetValuation_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssetValuation"
    ADD CONSTRAINT "AssetValuation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."AssetItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3364 (class 2606 OID 16502)
-- Name: Budget Budget_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3365 (class 2606 OID 16497)
-- Name: Budget Budget_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3360 (class 2606 OID 16477)
-- Name: Category Category_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3367 (class 2606 OID 16512)
-- Name: Holding Holding_portfolioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Holding"
    ADD CONSTRAINT "Holding_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES public."Portfolio"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3368 (class 2606 OID 16517)
-- Name: ManualAsset ManualAsset_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualAsset"
    ADD CONSTRAINT "ManualAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3366 (class 2606 OID 16507)
-- Name: Portfolio Portfolio_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Portfolio"
    ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3361 (class 2606 OID 16487)
-- Name: Transaction Transaction_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3362 (class 2606 OID 16492)
-- Name: Transaction Transaction_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3363 (class 2606 OID 16482)
-- Name: Transaction Transaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2025-11-04 01:53:17

--
-- PostgreSQL database dump complete
--

