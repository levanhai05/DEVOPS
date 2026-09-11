import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, BarChart3, Bell, Box, Check, ChevronDown, ChevronLeft,
  ChevronRight, CreditCard, Heart, LayoutDashboard,
  LogOut, Menu, Package, Plus, Search, Settings, ShoppingBag, ShoppingCart,
  Star, Tag, Trash2, TrendingUp, Truck, Users, X
} from "lucide-react";
import "./styles.css";

const products = [
  {id:1,name:"Aero Runner",category:"Giày",price:1890000,old:2290000,rating:4.9,image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",tag:"Bán chạy"},
  {id:2,name:"Cloud Hoodie",category:"Thời trang",price:990000,old:1290000,rating:4.8,image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",tag:"Mới"},
  {id:3,name:"Mono Backpack",category:"Phụ kiện",price:790000,old:950000,rating:4.7,image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",tag:"Hot"},
  {id:4,name:"Nova Watch",category:"Phụ kiện",price:2490000,old:2990000,rating:4.9,image:"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85",tag:"-17%"},
  {id:5,name:"Essential Tee",category:"Thời trang",price:420000,old:520000,rating:4.6,image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",tag:"Sale"},
  {id:6,name:"Daily Tote",category:"Phụ kiện",price:620000,old:760000,rating:4.8,image:"https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=85",tag:"Mới"},
  {id:7,name:"Street Jacket",category:"Thời trang",price:1590000,old:1890000,rating:4.7,image:"https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85",tag:"Limited"},
  {id:8,name:"Trail Sneaker",category:"Giày",price:2190000,old:2590000,rating:4.9,image:"https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",tag:"Hot"}
];

const money = n => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(n);

function useHashRoute(){
  const getRoute=()=>window.location.pathname.startsWith("/admin") ? window.location.pathname : (window.location.hash || "#/");
  const [route,setRoute]=useState(getRoute());
  useEffect(()=>{ const f=()=>setRoute(getRoute()); window.addEventListener("hashchange",f); window.addEventListener("popstate",f); return()=>{window.removeEventListener("hashchange",f);window.removeEventListener("popstate",f)}},[]);
  return route;
}

function Header({cartCount,onCart,onLogout}){
  const [search,setSearch]=useState("");
  return <header className="header">
    <div className="container nav">
      <a href="#/" className="logo"><span className="logo-mark">H</span>HAI</a>
      <nav className="desktop-nav">
        <a href="#/">Trang chủ</a><a href="#/shop">Cửa hàng</a><a href="#/shop?cat=Thời%20trang">Thời trang</a><a href="#/shop?cat=Phụ%20kiện">Phụ kiện</a>
      </nav>
      <div className="nav-actions">
        <div className="search-mini"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(window.location.hash="#/shop")} placeholder="Tìm sản phẩm..."/></div>
        <a className="icon-btn" href="/admin/login" title="Admin"><LayoutDashboard size={19}/></a>
        <button className="icon-btn cart-btn" onClick={onCart}><ShoppingCart size={19}/>{cartCount>0&&<b>{cartCount}</b>}</button>
        <button className="icon-btn" onClick={onLogout} title="Đăng xuất"><LogOut size={19}/></button>
      </div>
    </div>
  </header>
}

function ProductCard({p,onAdd}){
  return <article className="product-card">
    <div className="product-image"><img src={p.image}/><span className="product-tag">{p.tag}</span><button className="wish"><Heart size={17}/></button></div>
    <div className="product-info"><div className="muted">{p.category}</div><h3>{p.name}</h3><div className="rating"><Star size={14} fill="currentColor"/>{p.rating}<span>128 đánh giá</span></div><div className="price-row"><strong>{money(p.price)}</strong><del>{money(p.old)}</del></div><button className="add-btn" onClick={()=>onAdd(p)}><ShoppingBag size={17}/> Thêm vào giỏ</button></div>
  </article>
}

function Login({admin=false}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState("");

  const submit=e=>{
    e.preventDefault();
    if(!email.trim() || !password.trim()){ setError("Vui lòng nhập đầy đủ thông tin"); return; }
    localStorage.setItem(admin ? "hai_admin_auth" : "hai_customer_auth", "1");
    window.location.href=admin ? "/admin" : "/";
  };

  return <main className="login-page">
    <div className="login-visual">
      <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=90"/>
      <div className="login-visual-overlay"><span className="eyebrow">{admin ? "LUMA ADMIN" : "LUMA MEMBER"}</span><h1>{admin ? "Quản trị<br/><em>đơn giản hơn.</em>" : "Chào mừng trở lại"}</h1><p>{admin ? "Quản lý cửa hàng, đơn hàng và sản phẩm trong một không gian trực quan." : "Đăng nhập để theo dõi đơn hàng và tận hưởng trải nghiệm mua sắm dành riêng cho bạn."}</p></div>
    </div>
    <section className="login-card-wrap">
      <a href={admin ? "/" : "/"} className="logo login-logo"><span className="logo-mark">H</span>HAI</a>
      <div className="login-card">
        <div className="login-heading"><span className="eyebrow">{admin ? "ADMIN ACCESS" : "WELCOME BACK"}</span><h2>{admin ? "Đăng nhập quản trị" : "Đăng nhập tài khoản"}</h2><p>{admin ? "Nhập bất kỳ tài khoản nào để truy cập trang quản trị" : "Nhập thông tin tài khoản để tiếp tục mua sắm"}</p></div>
        <form onSubmit={submit} className="login-form">
          <label>Email hoặc tài khoản<input autoFocus value={email} onChange={e=>{setEmail(e.target.value);setError("")}} placeholder={admin ? "admin@hai.vn" : "you@example.com"} autoComplete="username"/></label>
          <label>Mật khẩu<div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={e=>{setPassword(e.target.value);setError("")}} placeholder="••••••••" autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? "Ẩn" : "Hiện"}</button></div></label>
          {error&&<div className="login-error">{error}</div>}
          <div className="login-options"><label className="remember"><input type="checkbox"/> Ghi nhớ đăng nhập</label><a href="#" onClick={e=>e.preventDefault()}>Quên mật khẩu?</a></div>
          <button className="primary login-submit" type="submit">Đăng nhập <ArrowRight size={18}/></button>
        </form>
        {!admin&&<p className="login-switch">Chưa có tài khoản? <a href="#" onClick={e=>e.preventDefault()}>Tạo tài khoản</a></p>}
        {admin&&<p className="login-switch">Không cần tài khoản cố định · Có thể dùng bất kỳ thông tin đăng nhập nào</p>}
      </div>
    </section>
  </main>
}

function Customer({cart,setCart}){
  const [cartOpen,setCartOpen]=useState(false);
  const [toast,setToast]=useState("");
  const add=p=>{setCart(c=>[...c,p]);setToast(`${p.name} đã thêm vào giỏ`);setTimeout(()=>setToast(""),1800)};
  const route=useHashRoute();
  const isShop=route.startsWith("#/shop");
  const params=new URLSearchParams(route.split("?")[1]||"");
  const category=params.get("cat");
  const visible=useMemo(()=>products.filter(p=>!category||p.category===category),[category]);
  const logout=()=>{localStorage.removeItem("hai_customer_auth");window.location.href="/login"};

  return <div>
    <Header cartCount={cart.length} onCart={()=>setCartOpen(true)} onLogout={logout}/>
    {!isShop ? <Home onAdd={add}/> : <Shop products={visible} category={category} onAdd={add}/>}
    {cartOpen&&<CartDrawer cart={cart} setCart={setCart} close={()=>setCartOpen(false)}/>}
    {toast&&<div className="toast"><Check size={18}/>{toast}</div>}
  </div>
}

function Home({onAdd}){
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow">NEW SEASON · 2026</span><h1>Đơn giản.<br/><em>Khác biệt.</em></h1><p>Những món đồ được chọn lọc cho nhịp sống hiện đại — thiết kế tinh gọn, chất lượng vượt mong đợi.</p><div className="hero-actions"><a href="#/shop" className="primary">Khám phá bộ sưu tập <ArrowRight size={18}/></a><a href="#/shop?cat=Giày" className="text-link">Xem sản phẩm bán chạy</a></div><div className="hero-stats"><div><b>12K+</b><span>Khách hàng</span></div><div><b>4.9/5</b><span>Đánh giá</span></div><div><b>48h</b><span>Giao hàng</span></div></div></div><div className="hero-visual"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=90"/><div className="floating-card"><span>Editor's pick</span><b>Aero Runner</b><small>1.890.000₫</small></div></div></div></section>
    <section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Sản phẩm nổi bật</h2></div><a href="#/shop" className="text-link">Xem tất cả <ArrowRight size={16}/></a></div><div className="product-grid">{products.slice(0,4).map(p=><ProductCard key={p.id} p={p} onAdd={onAdd}/>)}</div></div></section>
    <section className="banner"><div className="container banner-inner"><div><span className="eyebrow">LUMA MEMBER</span><h2>Đặc quyền dành riêng cho bạn</h2><p>Đăng ký thành viên để nhận ưu đãi 10% cho đơn hàng đầu tiên.</p></div><button className="primary">Trở thành thành viên <ArrowRight size={18}/></button></div></section>
    <footer><div className="container footer-grid"><div><a className="logo"><span className="logo-mark">L</span>LUMA</a><p>Modern essentials for modern life.</p></div><div><b>Mua sắm</b><a href="#/shop">Tất cả sản phẩm</a><a href="#/shop?cat=Thời%20trang">Thời trang</a><a href="#/shop?cat=Giày">Giày</a></div><div><b>Hỗ trợ</b><a>Chính sách đổi trả</a><a>Vận chuyển</a><a>Liên hệ</a></div><div><b>Admin</b><a href="/admin">Quản trị cửa hàng</a></div></div></footer>
  </>
}

function Shop({products:items,category,onAdd}){
  const [sort,setSort]=useState("featured");
  const sorted=[...items].sort((a,b)=>sort==="low"?a.price-b.price:sort==="high"?b.price-a.price:0);
  return <main className="shop-page"><div className="container"><div className="shop-top"><div><span className="eyebrow">SHOP</span><h1>{category||"Tất cả sản phẩm"}</h1><p>{items.length} sản phẩm được tuyển chọn</p></div><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Nổi bật</option><option value="low">Giá thấp → cao</option><option value="high">Giá cao → thấp</option></select></div><div className="category-pills"><a href="#/shop" className={!category?"active":""}>Tất cả</a>{["Thời trang","Giày","Phụ kiện"].map(c=><a className={category===c?"active":""} key={c} href={`#/shop?cat=${encodeURIComponent(c)}`}>{c}</a>)}</div><div className="product-grid">{sorted.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd}/>)}</div></div></main>
}

function CartDrawer({cart,setCart,close}){
  const total=cart.reduce((s,p)=>s+p.price,0);
  return <div className="overlay"><aside className="drawer"><div className="drawer-head"><div><span className="eyebrow">YOUR BAG</span><h2>Giỏ hàng ({cart.length})</h2></div><button className="icon-btn" onClick={close}><X/></button></div>{!cart.length?<div className="empty"><ShoppingBag size={42}/><h3>Giỏ hàng đang trống</h3><p>Thêm một vài món yêu thích của bạn nhé.</p><button className="primary" onClick={close}>Tiếp tục mua sắm</button></div>:<><div className="cart-items">{cart.map((p,i)=><div className="cart-item" key={`${p.id}-${i}`}><img src={p.image}/><div><b>{p.name}</b><span>{p.category}</span><strong>{money(p.price)}</strong></div><button onClick={()=>setCart(c=>c.filter((_,x)=>x!==i))}><Trash2 size={16}/></button></div>)}</div><div className="cart-summary"><div><span>Tạm tính</span><b>{money(total)}</b></div><div><span>Phí vận chuyển</span><b>Miễn phí</b></div><div className="total"><span>Tổng cộng</span><b>{money(total)}</b></div><button className="primary full">Thanh toán <ArrowRight size={18}/></button></div></>}</aside></div>
}

function Admin(){
  const [section,setSection]=useState("overview");
  const [notice,setNotice]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [inventory,setInventory]=useState(products);
  const nav=[
    ["overview","Tổng quan",LayoutDashboard],["orders","Đơn hàng",ShoppingBag],["products","Sản phẩm",Package],["customers","Khách hàng",Users],["analytics","Phân tích",BarChart3]
  ];
  return <div className="admin-shell"><aside className="admin-side"><a href="#/" className="logo admin-logo"><span className="logo-mark">L</span>LUMA</a><div className="admin-label">QUẢN TRỊ</div>{nav.map(([id,label,Icon])=><button key={id} className={section===id?"admin-nav active":"admin-nav"} onClick={()=>setSection(id)}><Icon size={18}/>{label}</button>)}<div className="side-bottom"><button className="admin-nav"><Settings size={18}/>Cài đặt</button><button className="admin-nav" onClick={()=>{localStorage.removeItem("hai_admin_auth");window.location.href="/admin/login"}}><LogOut size={18}/>Đăng xuất</button></div></aside><main className="admin-main"><div className="admin-top"><div><span className="eyebrow">MONDAY · 11 SEPTEMBER 2026</span><h1>{nav.find(x=>x[0]===section)?.[1]}</h1></div><div className="admin-user"><button className="icon-btn"><Bell size={18}/></button><span>HA</span><div><b>Hải Admin</b><small>Administrator</small></div><ChevronDown size={16}/></div></div>{section==="overview"&&<Dashboard inventory={inventory}/>} {section==="orders"&&<Orders/>}{section==="products"&&<Products inventory={inventory} setInventory={setInventory} openAdd={()=>setShowAdd(true)}/>} {section==="customers"&&<Customers/>}{section==="analytics"&&<Analytics/>}</main>{showAdd&&<AddProduct close={()=>setShowAdd(false)} add={p=>{setInventory(x=>[{...p,id:Date.now()},...x]);setShowAdd(false);setNotice("Đã thêm sản phẩm mới")}}/>}{notice&&<div className="toast"><Check size={18}/>{notice}</div>}</div>
}

function Dashboard({inventory}){
  const cards=[["Doanh thu","128.450.000₫","+18,4%",TrendingUp],["Đơn hàng","284","+12,8%",ShoppingBag],["Khách hàng","1.892","+9,2%",Users],["Sản phẩm",inventory.length,"+4,6%",Package]];
  return <><div className="stat-grid">{cards.map(([t,v,g,I])=><div className="stat-card" key={t}><div className="stat-icon"><I size={19}/></div><span>{t}</span><h2>{v}</h2><small><TrendingUp size={13}/> {g} <i>so với tháng trước</i></small></div>)}</div><div className="admin-grid"><div className="panel chart-panel"><div className="panel-head"><div><b>Doanh thu</b><span>6 tháng gần nhất</span></div><select><option>Doanh thu</option><option>Đơn hàng</option></select></div><div className="bars">{[58,72,49,84,68,96].map((h,i)=><div className="bar-wrap" key={i}><div className="bar" style={{height:`${h}%`}}></div><span>T{i+1}</span></div>)}</div></div><div className="panel"><div className="panel-head"><div><b>Đơn hàng mới</b><span>Hôm nay</span></div><a>View all</a></div><OrderMini name="Nguyễn Minh Anh" code="#LM-1048" price="2.490.000₫" status="Đang giao"/><OrderMini name="Trần Gia Huy" code="#LM-1047" price="990.000₫" status="Đã giao"/><OrderMini name="Lê Khánh Linh" code="#LM-1046" price="1.890.000₫" status="Chờ xử lý"/><OrderMini name="Phạm Tuấn" code="#LM-1045" price="620.000₫" status="Đã giao"/></div></div></>
}
function OrderMini({name,code,price,status}){return <div className="order-mini"><div className="avatar">{name.split(" ").map(x=>x[0]).slice(-2).join("")}</div><div><b>{name}</b><small>{code}</small></div><strong>{price}</strong><span className={`status ${status==="Đã giao"?"done":status==="Đang giao"?"shipping":""}`}>{status}</span></div>}

function Orders(){return <div className="panel table-panel"><div className="panel-head"><div><b>Tất cả đơn hàng</b><span>284 đơn hàng</span></div><div className="filters"><button>7 ngày <ChevronDown size={14}/></button><button>Trạng thái <ChevronDown size={14}/></button></div></div><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>{[["#LM-1048","Nguyễn Minh Anh","11/09/2026","2.490.000₫","Đang giao"],["#LM-1047","Trần Gia Huy","11/09/2026","990.000₫","Đã giao"],["#LM-1046","Lê Khánh Linh","10/09/2026","1.890.000₫","Chờ xử lý"],["#LM-1045","Phạm Tuấn","10/09/2026","620.000₫","Đã giao"],["#LM-1044","Mai Ngọc","09/09/2026","3.280.000₫","Đã giao"]].map(r=><tr key={r[0]}>{r.map((x,i)=><td key={i}>{i===4?<span className={`status ${x==="Đã giao"?"done":x==="Đang giao"?"shipping":""}`}>{x}</span>:x}</td>)}<td><button className="more">•••</button></td></tr>)}</tbody></table></div>}

function Products({inventory,setInventory,openAdd}){return <div className="panel table-panel"><div className="panel-head"><div><b>Kho sản phẩm</b><span>{inventory.length} sản phẩm</span></div><button className="primary small" onClick={openAdd}><Plus size={16}/> Thêm sản phẩm</button></div><table><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th></th></tr></thead><tbody>{inventory.map((p,i)=><tr key={p.id}><td><div className="product-cell"><img src={p.image}/><b>{p.name}</b></div></td><td>{p.category}</td><td>{money(p.price)}</td><td>{[24,8,42,15,67][i%5]}</td><td><span className="status done">Đang bán</span></td><td><button className="more" onClick={()=>setInventory(x=>x.filter(y=>y.id!==p.id))}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>}

function Customers(){return <div className="panel table-panel"><div className="panel-head"><div><b>Khách hàng</b><span>1.892 khách hàng</span></div><div className="search-admin"><Search size={16}/><input placeholder="Tìm khách hàng..."/></div></div><table><thead><tr><th>Khách hàng</th><th>Email</th><th>Đơn hàng</th><th>Chi tiêu</th><th>Hạng</th></tr></thead><tbody>{[["Nguyễn Minh Anh","minhanh@gmail.com","18","24.800.000₫","VIP"],["Trần Gia Huy","giahuy@gmail.com","12","15.200.000₫","Gold"],["Lê Khánh Linh","linh.le@gmail.com","9","9.480.000₫","Silver"],["Phạm Tuấn","tuanpham@gmail.com","7","6.210.000₫","Silver"]].map(r=><tr key={r[0]}><td><div className="customer-cell"><div className="avatar">{r[0].split(" ").map(x=>x[0]).slice(-2).join("")}</div><b>{r[0]}</b></div></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className="tier">{r[4]}</span></td></tr>)}</tbody></table></div>}

function Analytics(){return <div className="analytics-cards"><div className="panel insight"><span className="eyebrow">CONVERSION</span><h2>6,82%</h2><p>Tỷ lệ chuyển đổi đang tăng ổn định trong 30 ngày qua.</p><div className="spark">{[30,44,38,61,55,73,68,92,84].map((x,i)=><i key={i} style={{height:x+"%"}}/>)}</div></div><div className="panel insight"><span className="eyebrow">AVERAGE ORDER</span><h2>1.280.000₫</h2><p>Giá trị đơn hàng trung bình, tăng 8,4% so với tháng trước.</p><div className="progress"><i style={{width:"76%"}}/></div></div><div className="panel insight"><span className="eyebrow">TOP CATEGORY</span><h2>Thời trang</h2><p>Chiếm 42% tổng doanh thu trong tháng.</p><div className="category-stat"><b>42%</b><span>Thời trang</span></div></div></div>}

function AddProduct({close,add}){const [name,setName]=useState("");const [price,setPrice]=useState("");return <div className="modal-bg"><div className="modal"><div className="modal-head"><div><span className="eyebrow">INVENTORY</span><h2>Thêm sản phẩm</h2></div><button className="icon-btn" onClick={close}><X/></button></div><label>Tên sản phẩm<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: Urban Shirt"/></label><label>Giá bán<input value={price} onChange={e=>setPrice(e.target.value)} placeholder="990000"/></label><label>Danh mục<select><option>Thời trang</option><option>Giày</option><option>Phụ kiện</option></select></label><div className="modal-actions"><button className="secondary" onClick={close}>Hủy</button><button className="primary" disabled={!name||!price} onClick={()=>add({name,price:+price,old:+price,category:"Thời trang",rating:5,image:products[4].image,tag:"Mới"})}>Thêm sản phẩm</button></div></div></div>}

function App(){
  const [cart,setCart]=useState([]);
  const route=useHashRoute();
  const adminPath=window.location.pathname.startsWith("/admin");
  const customerAuthed=typeof window!=="undefined" && localStorage.getItem("hai_customer_auth")==="1";

  if(adminPath && window.location.pathname==="/admin/login") return <Login admin/>;
  if(adminPath) return <Admin/>;
  if(window.location.pathname==="/login") return <Login/>;
  if(!customerAuthed){ window.location.replace("/login"); return null; }
  return <Customer cart={cart} setCart={setCart}/>;
}

createRoot(document.getElementById("root")).render(<App/>);
