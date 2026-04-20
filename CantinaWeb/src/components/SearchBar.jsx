import { useState, React } from "react";

const SearchBar = ({ title, placeholder, buttonLabel, onSearch, onAdd }) => {
    const [term, setTerm] = useState("");

    const handleSearchClick = () => {
        onSearch(term);
    };

    return (
        <div className="rounded-3xl g360-gradient px-4 py-4 shadow-md md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center">
                    <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <input
                            type="text"
                            placeholder={placeholder}
                            className="w-full rounded-2xl border border-white/20 bg-white/95 px-4 py-2.5 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40 sm:min-w-[260px]"
                            onChange={(e) => setTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearchClick();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleSearchClick}
                            className="rounded-2xl bg-slate-950/20 px-4 py-2.5 font-bold text-white transition hover:bg-slate-950/30"
                        >
                            Buscar
                        </button>
                        <button
                            type="button"
                            onClick={onAdd}
                            className="rounded-2xl bg-white/15 px-4 py-2.5 font-bold text-white transition hover:bg-white/25"
                        >
                            {buttonLabel}
                        </button>
                </div>
            </div>
        </div>
    );
};

export default SearchBar;
