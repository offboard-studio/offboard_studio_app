/* eslint-disable react/jsx-no-useless-fragment */
import { ListItemButton, ListItemIcon } from "@mui/material";
// import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
// import colorConfigs from "../../configs/colorConfigs";
// import { RootState } from "../../redux/store";
// import { RouteType } from "../../routes/config";


const SidebarItem: React.FC = () => {
    //   const { appState } = useSelector((state: RootState) => state.appState);

    return (
        <>
            <ListItemButton
                component={Link}
                to={""}
                sx={{
                    "&: hover": {
                        // backgroundColor: colorConfigs.sidebar.hoverBg
                    },
                    //   backgroundColor: appState === item.state ? colorConfigs.sidebar.activeBg : "unset",
                    paddingY: "12px",
                    paddingX: "24px"
                }}
            >
                <ListItemIcon sx={{
                    //   color: colorConfigs.sidebar.color
                }}>
                    {/* {item.sidebarProps.icon && item.sidebarProps.icon} */}
                </ListItemIcon>
                {/* {item.sidebarProps.displayText} */}
            </ListItemButton>
        </>
    );
};

export default SidebarItem;